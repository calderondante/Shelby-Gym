import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.PAGES_BASE_URL || "http://127.0.0.1:4173/gestion/";
if (!/^http:\/\/(localhost|127\.0\.0\.1):4173\/gestion\/$/.test(base))
  throw Error("La simulación larga solo usa una demo local aislada.");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors = [],
  observations = [],
  diary = [],
  people = [],
  expectedPayments = [],
  expectedExpenses = [],
  obligations = [];
page.on("pageerror", (e) => errors.push(e.message));
const dayAt = (n) =>
  new Date(Date.UTC(2027, 0, 25 + n, 15)).toISOString().slice(0, 10);
let currentDay = dayAt(0),
  actionCount = 0;
const check = async (name, run) => {
  try {
    await run();
    observations.push({ name, status: "passed", day: currentDay });
  } catch (e) {
    observations.push({
      name,
      status: "failed",
      day: currentDay,
      error: e.message,
    });
  }
};
const go = async (hash, ready) => {
  await page.goto(`${base}#${hash}`);
  if (ready) await page.locator(ready).first().waitFor();
};
await page.clock.setFixedTime(new Date(`${currentDay}T15:00:00Z`));
await page.addInitScript(() => {
  if (!localStorage.getItem("shelby-audit-initialized")) {
    localStorage.setItem(
      "shelby-gym-demo-v1",
      JSON.stringify({
        activities: [],
        customers: [],
        expenses: [],
        expenseTemplates: [],
        monthlyClosings: {},
        campaigns: [],
        raffleDraws: {},
      }),
    );
    localStorage.setItem("shelby-audit-initialized", "yes");
  }
  sessionStorage.setItem("shelby-gym-demo-unlocked", "yes");
});
await page.goto(base);
await page.locator("#main").waitFor();
async function createActivity(
  name,
  price,
  unit = "months",
  count = 1,
  existingId = "",
) {
  await go(`actividad-nueva/${existingId}`, "#activity-form");
  await page.locator("#activity-name").fill(name);
  await page.locator("#activity-price").fill(String(price));
  await page.locator("#activity-unit").selectOption(unit);
  await page.locator("#activity-months").fill(String(count));
  await page.getByRole("button", { name: "Guardar actividad" }).click();
  await expect(page.locator("#activity-form")).toHaveCount(0);
  actionCount++;
  return page.evaluate(
    (name) => state.activities.find((a) => a.name === name).id,
    name,
  );
}
const muscle = await createActivity("Musculación", 36000),
  martial = await createActivity("Kickboxing", 42000),
  pack = await createActivity("Personal · 3 clases", 27000, "sessions", 3);
async function register(
  name,
  activity,
  total,
  first,
  method,
  birthMonth = 2,
  second = 0,
) {
  await go("nuevo", "#customer-name");
  await page.locator("#customer-name").fill(name);
  await page.locator("#customer-phone").fill("+5491112345678");
  await page.locator("#customer-instagram").fill("@entrena.shelby");
  await page.locator("#customer-marketing").check();
  await page.locator("#customer-birth-month").selectOption(String(birthMonth));
  await page.locator("#customer-activity").selectOption(activity);
  await page.locator("#payment-1").fill(String(first));
  await page.locator("#method-1").selectOption(method);
  if (second) {
    await page.locator("#payment-2").fill(String(second));
    await page.locator("#method-2").selectOption("Efectivo");
  }
  await page
    .getByRole("button", { name: "Registrar cliente", exact: true })
    .click();
  await expect(page.locator("#customer-name")).toHaveCount(0);
  const id = await page.evaluate(
    (name) => state.customers.find((c) => c.name === name).id,
    name,
  );
  const person = {
    id,
    name,
    periods: [
      {
        personId: id,
        periodIndex: 0,
        start: currentDay,
        total,
        activity,
        payments: first + second,
        unit: activity === pack ? "sessions" : "months",
      },
    ],
  };
  people.push(person);
  obligations.push(person.periods[0]);
  expectedPayments.push({
    personId: id,
    periodIndex: 0,
    date: currentDay,
    amount: first,
    method,
    name,
  });
  if (second)
    expectedPayments.push({
      date: currentDay,
      personId: id,
      periodIndex: 0,
      amount: second,
      method: "Efectivo",
      name,
    });
  actionCount++;
  return person;
}
async function pay(person, amount, method = "Transferencia", index = -1) {
  await go(`abonar/${person.id}/${index}`, "#pay-form");
  await page.locator("#pay-amount").fill(String(amount));
  await page.locator("#pay-method").selectOption(method);
  await page.getByRole("button", { name: "Guardar abono" }).click();
  await expect(page.locator("#pay-form")).toHaveCount(0);
  expectedPayments.push({
    date: currentDay,
    amount,
    method,
    name: person.name,
    personId: person.id,
    periodIndex: index < 0 ? person.periods.length - 1 : index,
  });
  person.periods[index < 0 ? person.periods.length - 1 : index].payments +=
    amount;
  actionCount++;
}
async function renew(person, activity, total, amount) {
  await go(`regresar/${person.id}`, "#return-form");
  await page.locator("#return-activity").selectOption(activity);
  await page.locator("#return-amount").fill(String(amount));
  await page.getByRole("button", { name: "Confirmar nueva cuota" }).click();
  await expect(page.locator("#return-form")).toHaveCount(0);
  const period = {
    personId: person.id,
    periodIndex: person.periods.length,
    start: currentDay,
    total,
    activity,
    payments: amount,
    unit: activity === pack ? "sessions" : "months",
  };
  person.periods.push(period);
  obligations.push(period);
  expectedPayments.push({
    date: currentDay,
    amount,
    method: "Transferencia",
    name: person.name,
    personId: person.id,
    periodIndex: person.periods.length - 1,
  });
  actionCount++;
}
// Existing members represent a gym migrating from its previous ledger.
const legacy = [
  {
    id: "legacy-rafael",
    name: "Rafael Ibarra",
    start: "2026-10-31",
    end: "2026-11-30",
    total: 30000,
    paid: 20000,
    birthMonth: 2,
  },
  {
    id: "legacy-paula",
    name: "Paula Moreno",
    start: "2027-01-01",
    end: "2027-01-31",
    total: 30000,
    paid: 30000,
    birthMonth: 3,
  },
];
await page.evaluate(
  ({ rows, activity }) => {
    for (const c of rows)
      state.customers.push({
        id: c.id,
        name: c.name,
        start: c.start,
        end: c.end,
        price: c.total,
        phone: "+5491112345678",
        instagram: "@shelby.entrena",
        marketingOptIn: true,
        instagramMarketingOptIn: false,
        birthMonth: c.birthMonth,
        activityId: activity,
        activityName: "Musculación",
        unit: "months",
        count: 1,
        history: [],
        sessionEvents: [],
        createdAt: c.start,
        registeredAt: `${c.start}T15:00:00Z`,
        payments: [{ date: c.start, amount: c.paid, method: "Efectivo" }],
      });
    save();
  },
  { rows: legacy, activity: muscle },
);
for (const c of legacy) {
  const period = {
    personId: c.id,
    periodIndex: 0,
    start: c.start,
    total: c.total,
    activity: muscle,
    payments: c.paid,
    unit: "months",
  };
  people.push({ id: c.id, name: c.name, periods: [period] });
  obligations.push(period);
  expectedPayments.push({
    personId: c.id,
    periodIndex: 0,
    date: c.start,
    amount: c.paid,
    method: "Efectivo",
    name: c.name,
  });
}
const alba = await register(
  "Alba Núñez",
  muscle,
  36000,
  18000,
  "Transferencia",
  2,
  18000,
);
const bruno = await register("Bruno Acosta", martial, 42000, 15000, "Efectivo");
const clara = await register("Clara Díaz", pack, 27000, 9000, "Transferencia");
await go("plantillas", "#template-form");
await page.locator("#template-title").fill("Electricidad");
await page.locator("#template-amount").fill("80000");
await page.locator("#template-day").fill("31");
await page.getByRole("button", { name: "Guardar plantilla" }).click();
actionCount++;
const names = [
  "Diego Rojas",
  "Elena Torres",
  "Facundo Vega",
  "Gabriela Paz",
  "Hernán Ruiz",
  "Inés Molina",
  "Javier Santos",
  "Karina Luna",
  "Lucas Herrera",
  "María Silva",
  "Nicolás Castro",
  "Olivia Suárez",
  "Pablo Medina",
  "Romina Flores",
  "Santiago Peralta",
  "Tamara Méndez",
  "Ulises Navarro",
  "Valeria Romero",
  "Walter Giménez",
  "Ximena Costa",
  "Yamila Cáceres",
  "Zoe Rivas",
  "Andrés Salas",
  "Belén Ortiz",
  "Cristian Sosa",
  "Daniela Arias",
  "Esteban Ferreyra",
  "Florencia Godoy",
  "Gustavo Moreno",
  "Julieta Cabrera",
];
await go("comunicaciones/duenos", "[data-comm-owner]");
await page.locator("#co-0-name").fill("Lucía Montoya");
await page.locator("#co-0-phone").fill("+5491112345678");
await page.getByRole("button", { name: "Agregar dueño", exact: true }).click();
actionCount++;
await go("comunicaciones/automatizaciones", "#comm-review");
await page.locator("#cr-expense-enabled").check();
await page.locator("#cr-every").fill("3");
await page
  .locator('[data-comm-rule="expense"]')
  .getByRole("button", { name: "Guardar regla" })
  .click();
await page.locator("#cr-recovery-enabled").check();
await page.locator("#cr-audience").selectOption("all_eligible");
await page
  .locator('[data-comm-rule="recovery"]')
  .getByRole("button", { name: "Guardar regla" })
  .click();
actionCount += 2;
const frozen = new Map();
for (let day = 0; day < 45; day++) {
  currentDay = dayAt(day);
  await page.clock.setFixedTime(new Date(`${currentDay}T15:00:00Z`));
  await page.reload();
  await page.locator("#main").waitFor();
  const before = actionCount;
  if (day < names.length) {
    const activity = day % 4 === 0 ? pack : day % 3 === 0 ? martial : muscle;
    const total =
      activity === pack
        ? 27000
        : activity === martial
          ? 42000
          : day >= 15
            ? 40000
            : 36000;
    await register(
      names[day],
      activity,
      total,
      day % 2 === 0 ? total : Math.floor(total / 2),
      day % 3 === 0 ? "Mercado Pago" : "Transferencia",
      (day % 3) + 1,
    );
  }
  if (day === 15) {
    await createActivity("Musculación", 40000, "months", 1, muscle);
  }
  if (day === 4) {
    await pay(bruno, 10000, "Transferencia");
  }
  if ([2, 5, 7].includes(day)) {
    await go(`clase/${clara.id}/-1`, "#session-form");
    await page.locator("#session-debt").check();
    await page
      .getByRole("button", { name: "Registrar clase realizada" })
      .click();
    actionCount++;
  }
  if (day === 8) {
    await go(`clase/${clara.id}/-1`, "[data-session-reverse]");
    page.once("dialog", (d) => d.accept("Se marcó asistencia por error"));
    await page.locator("[data-session-reverse]").first().click();
    actionCount++;
    await check(
      "La corrección devuelve una clase y conserva el consumo",
      async () => {
        assert.equal(
          await page.evaluate(
            (id) => remainingClasses(state.customers.find((c) => c.id === id)),
            clara.id,
          ),
          1,
        );
      },
    );
  }
  if (day === 9) {
    await pay(clara, 18000, "Efectivo");
  }
  if (day === 6) {
    await check(
      "Último día de enero: cuota mensual se ajusta al 28 de febrero",
      async () => {
        const person = people.at(-1);
        const end = await page.evaluate(
          (id) => state.customers.find((c) => c.id === id).end,
          person.id,
        );
        if (person.periods[0].unit === "months")
          assert.equal(end, "2027-02-28");
      },
    );
  }
  if (day === 10) {
    await go(`cliente/${alba.id}`, "#archive-customer");
    page.once("dialog", (d) => d.accept());
    await page.locator("#archive-customer").click();
    actionCount++;
    await go(`regresar/${alba.id}`, "#resume-active");
    await page
      .getByRole("button", { name: "Reactivar sin nueva cuota" })
      .click();
    actionCount++;
    await check("Reactivar una cuota vigente no agrega cargos", async () =>
      assert.equal(
        await page.evaluate(
          (id) => allPeriods(state.customers.find((c) => c.id === id)).length,
          alba.id,
        ),
        1,
      ),
    );
  }
  if (day === 11) {
    await go(`borrar/${bruno.id}`, "#delete-form");
    await page.locator("#confirm-name").fill(bruno.name);
    await page
      .getByRole("button", { name: "Eliminar perfil", exact: true })
      .click();
    actionCount++;
    await check("Eliminar conserva deuda e ingresos", async () =>
      assert.equal(
        await page.evaluate(
          (id) => balance(state.customers.find((c) => c.id === id)),
          bruno.id,
        ),
        17000,
      ),
    );
  }
  if (day === 12) {
    await go(`regresar/${bruno.id}`, "#resume-active");
    await page
      .getByRole("button", { name: "Reactivar sin nueva cuota" })
      .click();
    actionCount++;
  }
  if ([0, 7, 35].includes(day)) {
    const month = currentDay.slice(0, 7);
    await go(`gastos/${month}`, "#generate-expenses");
    await page.getByRole("button", { name: "Generar recurrentes" }).click();
    actionCount++;
    await check(
      `Recurrente ${month} no se duplica y ajusta fin de mes`,
      async () => {
        await page.getByRole("button", { name: "Generar recurrentes" }).click();
        actionCount++;
        const rows = await page.evaluate(
          (month) => state.expenses.filter((e) => e.dueOn.startsWith(month)),
          month,
        );
        assert.equal(rows.length, 1);
        if (month === "2027-02") assert.equal(rows[0].dueOn, "2027-02-28");
      },
    );
  }
  if ([7, 20].includes(day)) {
    const month = currentDay.slice(0, 7),
      expense = await page.evaluate(
        (month) => state.expenses.find((e) => e.dueOn.startsWith(month)).id,
        month,
      ),
      amount = day === 7 ? 25000 : 15000;
    await go(`gasto-pago/${expense}`, "#expense-pay");
    await page.locator("#expense-cash").fill(String(amount));
    await page
      .getByRole("button", { name: "Registrar pago", exact: true })
      .click();
    expectedExpenses.push({ date: currentDay, amount, method: "Efectivo" });
    actionCount++;
  }
  if (day === 21) {
    await go(`gastos/${currentDay.slice(0, 7)}`, "[data-reverse-expense]");
    page.once("dialog", (d) => d.accept("Medio de pago mal registrado"));
    await page.locator("[data-reverse-expense]").first().click();
    expectedExpenses.push({
      date: currentDay,
      amount: -25000,
      method: "Efectivo",
    });
    actionCount++;
  }
  if ([4, 5].includes(day))
    await check(
      `Campaña espera dos meses calendario (${currentDay})`,
      async () => {
        await go("comunicaciones/campanas", "#comm-search");
        await page.locator("#comm-search").fill("Rafael Ibarra");
        const enabled = await page
          .locator('[name="comm-recipient"]')
          .isEnabled();
        assert.equal(enabled, day === 5);
        if (enabled) {
          await page
            .getByRole("button", { name: "Seleccionar habilitados" })
            .click();
          await page.locator("#comm-offer").fill("Consultá el plan de regreso");
          await page
            .getByRole("button", { name: "Preparar mensajes privados" })
            .click();
          await page
            .getByRole("heading", { name: "Mensajes preparados", exact: true })
            .waitFor();
          assert.match(
            await page.locator(".ops-item").first().innerText(),
            /Rafael Ibarra/,
          );
          actionCount++;
        }
      },
    );
  if (day === 18)
    await check(
      "El sorteo de febrero excluye packs y cuotas vencidas más de 30 días",
      async () => {
        await go("clientes", "#search");
        await page
          .getByRole("button", { name: "Cumpleaños", exact: true })
          .click();
        await page.locator("#birthday-month").selectOption("0");
        assert.match(
          await page
            .locator(".birthday-row")
            .filter({ hasText: "Rafael Ibarra" })
            .innerText(),
          /30 días/,
        );
        assert.match(
          await page
            .locator(".birthday-row")
            .filter({ hasText: "Clara Díaz" })
            .innerText(),
          /Sin cuota de socio/,
        );
        page.once("dialog", (d) => d.accept());
        await page
          .getByRole("button", { name: "Cerrar sorteo", exact: true })
          .click();
        actionCount++;
      },
    );
  if (day === 19)
    await check(
      "El alta posterior al sorteo queda excluida ese año",
      async () => {
        await go("clientes", "#search");
        await page
          .getByRole("button", { name: "Cumpleaños", exact: true })
          .click();
        await page.locator("#birthday-month").selectOption("0");
        assert.match(
          await page
            .locator(".birthday-row")
            .filter({ hasText: names[day] })
            .innerText(),
          /Alta posterior|No figuraba/,
        );
      },
    );
  if ([36, 37].includes(day))
    await check(
      `Filtro de más de 30 días respeta el límite (${currentDay})`,
      async () => {
        await go("clientes", "#search");
        await page
          .getByRole("button", { name: "Más de 30 días", exact: true })
          .click();
        await page.locator("#search").fill("Paula Moreno");
        await expect(
          page.locator("[data-customer]").filter({ hasText: "Paula Moreno" }),
        ).toHaveCount(day === 37 ? 1 : 0);
        await page.locator("#search").fill("");
        await page.getByRole("button", { name: "Todos", exact: true }).click();
      },
    );
  if (day === 31) {
    await renew(bruno, martial, 42000, 21000);
  }
  if (day === 32) {
    await pay(bruno, 17000, "Efectivo", 0);
  }
  if (day === 33)
    await check(
      "Regreso tras tres meses: nueva cuota desde hoy y deuda antigua separada",
      async () => {
        const rafael = people.find((p) => p.id === "legacy-rafael");
        await renew(rafael, muscle, 40000, 20000);
        const actual = await page.evaluate(() => {
          const c = state.customers.find((c) => c.id === "legacy-rafael");
          return {
            periods: allPeriods(c).length,
            oldDebt:
              c.history[0].price -
              c.history[0].payments.reduce((s, p) => s + p.amount, 0),
            start: c.start,
            price: c.price,
            balance: balance(c),
          };
        });
        assert.deepEqual(actual, {
          periods: 2,
          oldDebt: 10000,
          start: currentDay,
          price: 40000,
          balance: 30000,
        });
      },
    );
  if (day === 38)
    await pay(
      people.find((p) => p.id === "legacy-rafael"),
      10000,
      "Efectivo",
      0,
    );
  if (day === 35) {
    const months = ["2027-01", "2027-02"];
    for (const month of months) {
      await go(`resumen/${month}`, "#close-report");
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: "Cerrar y conservar resumen" })
        .click();
      actionCount++;
      frozen.set(
        month,
        await page.evaluate(
          (month) => JSON.stringify(state.monthlyClosings[month]),
          month,
        ),
      );
    }
  }
  if (day === 37) {
    const debtor = people.find(
      (p) =>
        p.periods[0].payments < p.periods[0].total &&
        p.periods[0].start.startsWith("2027-02"),
    );
    if (debtor)
      await pay(
        debtor,
        debtor.periods[0].total - debtor.periods[0].payments,
        "Mercado Pago",
      );
  }
  await check(
    `Revisión de avisos sin duplicados ni envíos (${currentDay})`,
    async () => {
      await go("comunicaciones/automatizaciones", "#comm-review");
      await page.getByRole("button", { name: "Revisar avisos de hoy" }).click();
      await page
        .getByRole("heading", { name: "Mensajes preparados", exact: true })
        .waitFor();
      actionCount++;
      const firstCount = await page.evaluate(
        () => state.communications.outbox.length,
      );
      if (day % 7 === 0) {
        await go("comunicaciones/automatizaciones", "#comm-review");
        await page
          .getByRole("button", { name: "Revisar avisos de hoy" })
          .click();
        await page
          .getByRole("heading", { name: "Mensajes preparados", exact: true })
          .waitFor();
        actionCount++;
        assert.equal(
          await page.evaluate(() => state.communications.outbox.length),
          firstCount,
        );
      }
      assert.equal(
        await page.evaluate(() =>
          state.communications.outbox.every((m) =>
            ["prepared", "cancelled"].includes(m.status),
          ),
        ),
        true,
      );
    },
  );
  await check(`Conciliación diaria ${currentDay}`, async () => {
    const actual = await page.evaluate(() => ({
      received: allPayments().reduce(
        (s, p) => s + Math.round(p.amount * 100),
        0,
      ),
      pending: state.customers.reduce(
        (s, c) => s + Math.round(balance(c) * 100),
        0,
      ),
      spent: state.expenses.reduce(
        (s, e) => s + Math.round(expensePaid(e) * 100),
        0,
      ),
    }));
    assert.equal(
      actual.received,
      expectedPayments.reduce((s, p) => s + Math.round(p.amount * 100), 0),
    );
    assert.equal(
      actual.pending,
      obligations.reduce(
        (s, p) => s + Math.round((p.total - p.payments) * 100),
        0,
      ),
    );
    assert.equal(
      actual.spent,
      expectedExpenses.reduce((s, p) => s + Math.round(p.amount * 100), 0),
    );
  });
  await go(
    `movimientos/${currentDay.slice(0, 7)}/${currentDay}`,
    ".ledger-day-strip",
  );
  for (const [month, snapshot] of frozen)
    await check(`Cierre ${month} sigue inmutable el ${currentDay}`, async () =>
      assert.equal(
        await page.evaluate(
          (month) => JSON.stringify(state.monthlyClosings[month]),
          month,
        ),
        snapshot,
      ),
    );
  diary.push({ day: currentDay, actions: actionCount - before });
}
for (const [month, snapshot] of frozen)
  await check(`Cierre ${month} cuadra al fin de ese mes`, async () => {
    const data = JSON.parse(snapshot).data;
    const next = month === "2027-01" ? "2027-02-01" : "2027-03-01";
    const expectedDebt = obligations
      .filter((p) => p.start < next)
      .reduce(
        (sum, p) =>
          sum +
          p.total -
          expectedPayments
            .filter(
              (payment) =>
                payment.personId === p.personId &&
                payment.periodIndex === p.periodIndex &&
                payment.date < next,
            )
            .reduce((sum, p) => sum + p.amount, 0),
        0,
      );
    assert.equal(
      data.received,
      expectedPayments
        .filter((p) => p.date.startsWith(month))
        .reduce((sum, p) => sum + p.amount, 0),
    );
    assert.equal(data.pending, expectedDebt);
    assert.equal(
      data.spent,
      expectedExpenses
        .filter((p) => p.date.startsWith(month))
        .reduce((sum, p) => sum + p.amount, 0),
    );
  });
for (const month of ["2027-01", "2027-02", "2027-03"])
  await check(
    `Resumen ${month} coincide con cobros y gastos independientes`,
    async () => {
      const report = await page.evaluate((month) => reportData(month), month);
      assert.equal(
        Math.round(report.received * 100),
        expectedPayments
          .filter((p) => p.date.startsWith(month))
          .reduce((s, p) => s + Math.round(p.amount * 100), 0),
      );
      assert.equal(
        Math.round(report.spent * 100),
        expectedExpenses
          .filter((p) => p.date.startsWith(month))
          .reduce((s, p) => s + Math.round(p.amount * 100), 0),
      );
    },
  );
// Explore a profile with simultaneous activities, then a temporary absence.
await check(
  "Reactivar conserva una cuota anterior vigente aunque el último pack esté agotado",
  async () => {
    const holder = await register(
      "Marina Valle",
      muscle,
      40000,
      40000,
      "Transferencia",
    );
    await renew(holder, pack, 27000, 27000);
    for (let i = 0; i < 3; i++) {
      await go(`clase/${holder.id}/-1`, "#session-form");
      await page
        .getByRole("button", { name: "Registrar clase realizada" })
        .click();
      actionCount++;
    }
    await go(`cliente/${holder.id}`, "#archive-customer");
    page.once("dialog", (d) => d.accept());
    await page.locator("#archive-customer").click();
    await go(`regresar/${holder.id}`, "#main");
    await expect(page.locator("#resume-active")).toBeVisible({ timeout: 1000 });
  },
);
await check(
  "Un alumno con solo clases conserva el saldo sin inventar una fecha de vencimiento",
  async () => {
    const person = await register("Pedro Vidal", pack, 27000, 9000, "Efectivo");
    await go(`abonar/${person.id}`, "#pay-form");
    assert.doesNotMatch(
      await page.locator(".hero p").innerText(),
      /Invalid|NaN|null/,
    );
  },
);
mkdirSync("qa-artifacts/month-simulation", { recursive: true });
for (const width of [375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const [route, ready] of [
    ["clientes", "#search"],
    ["movimientos/2027-02/2027-02-28", ".ledger-day-strip"],
    ["resumen/2027-02", "#export-report"],
    ["gastos/2027-02", "#expense-month"],
    ["comunicaciones/historial", ".comm-tabs"],
  ]) {
    await go(route, ready);
    await check(
      `Sin desbordes después de 45 días: ${route} a ${width}px`,
      async () =>
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        ),
    );
    if (width === 390 && route === "resumen/2027-02")
      await page.screenshot({
        path: "qa-artifacts/month-simulation/financial-summary-390.png",
        fullPage: true,
      });
  }
}
for (const [route, ready] of [
  ["clientes", "#search"],
  ["comunicaciones/automatizaciones", "#comm-review"],
  ["gastos/2027-03", "#expense-month"],
]) {
  await go(route, ready);
  await check(
    `Accesibilidad automática con un mes de datos: ${route}`,
    async () => {
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          elements: v.nodes.map((n) => n.target),
        })),
        [],
      );
    },
  );
}
await go("clientes", "#search");
const result = {
  period: [dayAt(0), dayAt(44)],
  simulatedDays: 45,
  customers: people.length,
  actions: actionCount,
  financialTransactions: expectedPayments.length + expectedExpenses.length,
  observations,
  diary,
  errors,
  totals: {
    received: expectedPayments.reduce((s, p) => s + p.amount, 0),
    spent: expectedExpenses.reduce((s, p) => s + p.amount, 0),
    pending: obligations.reduce((s, p) => s + p.total - p.payments, 0),
  },
};
writeFileSync(
  "qa-artifacts/month-simulation/result.json",
  JSON.stringify(result, null, 2),
);
await page.screenshot({
  path: "qa-artifacts/month-simulation/final-mobile.png",
  fullPage: true,
});
await browser.close();
console.log(
  JSON.stringify({
    days: result.simulatedDays,
    customers: result.customers,
    actions: result.actions,
    financialTransactions: result.financialTransactions,
    passed: observations.filter((o) => o.status === "passed").length,
    failed: observations
      .filter((o) => o.status === "failed")
      .map((o) => ({ name: o.name, error: o.error.slice(0, 220) })),
    errors,
  }),
);
assert.equal(
  observations.filter((o) => o.status === "failed").length,
  0,
  "Hay observaciones que requieren corrección; ver reporte local.",
);
assert.deepEqual(errors, []);
