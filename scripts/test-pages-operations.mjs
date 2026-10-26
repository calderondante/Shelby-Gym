import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
const base = process.env.PAGES_BASE_URL || "http://127.0.0.1:4173/gestion/";
const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(base);
await page.locator("#pin").fill("SHELBY26");
await page.getByRole("button", { name: "Abrir Shelby Gym" }).click();
assert.equal(
  await page.evaluate(() =>
    balance({
      price: 0,
      payments: [],
      history: [{ price: 0.8, payments: [{ amount: 0.1 }, { amount: 0.7 }] }],
    }),
  ),
  0,
  "Los pagos decimales no dejan saldos residuales",
);
const go = async (hash) => {
  await page.goto(`${base}${hash}`);
  await page.locator("#main").waitFor();
};
const check = async (text) => {
  await page
    .getByText(text, { exact: false })
    .first()
    .waitFor({ state: "visible" });
};
await go("#actividad-nueva");
await page.locator("#activity-name").fill("Boxeo particular");
await page.locator("#activity-price").fill("30000");
await page.locator("#activity-unit").selectOption("sessions");
await page.locator("#activity-months").fill("3");
await page.locator("#activity-offer").fill("25000");
await page.locator("#activity-offer-label").fill("Pack de bienvenida");
await page.getByRole("button", { name: "Guardar actividad" }).click();
await check("3 clases · sin vencimiento");
const activityId = await page.evaluate(
  () => state.activities.find((a) => a.name === "Boxeo particular").id,
);
const birthMonth = await page.evaluate(() => Number(today().slice(5, 7)));
async function register(name, activity, amount) {
  await go("#nuevo");
  await page.locator("#customer-name").fill(name);
  await page.locator("#customer-phone").fill("+54 9 11 0000 0000");
  await page.locator("#customer-instagram").fill("@camila.entrena");
  await page.locator("#customer-marketing").check();
  await page.locator("#customer-birth-month").selectOption(String(birthMonth));
  await page.locator("#customer-activity").selectOption(activity);
  await page.locator("#payment-1").fill(String(amount));
  await page
    .getByRole("button", { name: "Registrar cliente", exact: true })
    .click();
  await page.waitForURL(/#cliente\//);
  return page.url().split("#cliente/")[1];
}
const camila = await register("Camila Torres", activityId, 10000);
await check("@camila.entrena");
await page.getByRole("link", { name: "Ver clases", exact: true }).click();
await page.locator("#session-debt").check();
await page.getByRole("button", { name: "Registrar clase realizada" }).click();
await check("2 / 3");
await page.locator("#session-debt").check();
await page.getByRole("button", { name: "Registrar clase realizada" }).click();
await check("1 / 3");
page.once("dialog", (d) => d.accept("Error de recepción"));
await page
  .getByRole("button", { name: "Corregir", exact: true })
  .first()
  .click();
await check("2 / 3");
await go(`#regresar/${camila}`);
await page.locator("#return-activity").selectOption("musculacion");
await page.locator("#return-amount").fill("35000");
await page.getByRole("button", { name: "Confirmar nueva cuota" }).click();
await page.waitForURL(/#cliente\//);
await check("2 de 3 clases disponibles");
const julian = await register("Julián Benítez", activityId, 25000);
await go("#clientes");
await page.getByRole("button", { name: "Cumpleaños", exact: true }).click();
await check("Sin cuota de socio");
assert.ok(
  await page
    .locator(".birthday-row")
    .filter({ hasText: "Julián Benítez" })
    .filter({ hasText: "Sin cuota de socio" })
    .count(),
);
const stray = await page.locator(".birthday-row small").allTextContents();
assert.ok(
  !stray.some((text) => /^\d+$/.test(text)),
  "Sin índices debajo del nombre",
);
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Cerrar sorteo", exact: true }).click();
await check("Participantes conservados al cierre");
await go(`#editar/${camila}`);
await page.locator("#edit-name").fill("Camila Torres Actualizada");
await page.getByRole("button", { name: "Guardar perfil" }).click();
await go("#clientes");
await page.getByRole("button", { name: "Cumpleaños", exact: true }).click();
await check("Camila Torres");
assert.ok(
  !(await page
    .locator(".birthday-row")
    .filter({ hasText: "Camila Torres Actualizada" })
    .count()),
  "Nombre al cierre conservado",
);
await register("Micaela Paz", "boxeo", 30000);
await go("#clientes");
await page.getByRole("button", { name: "Cumpleaños", exact: true }).click();
assert.ok(
  await page
    .locator(".birthday-row")
    .filter({ hasText: "Micaela Paz" })
    .filter({ hasText: "Alta posterior al sorteo" })
    .count(),
);
await go("#plantillas");
await page.locator("#template-title").fill("Electricidad");
await page.locator("#template-amount").fill("20000");
await page.locator("#template-day").fill("31");
await page.getByRole("button", { name: "Guardar plantilla" }).click();
await go("#gastos");
await page.getByRole("button", { name: "Generar recurrentes" }).click();
await page.getByRole("button", { name: "Generar recurrentes" }).click();
assert.equal(
  await page.evaluate(
    () => state.expenses.filter((e) => e.title === "Electricidad").length,
  ),
  1,
);
await page.getByRole("link", { name: "Registrar pago", exact: true }).click();
await page.locator("#expense-cash").fill("4000");
await page.locator("#expense-transfer").fill("4000");
await page.getByRole("button", { name: "Registrar pago", exact: true }).click();
await check("Falta");
assert.equal(
  await page.evaluate(() => expenseBalance(state.expenses[0])),
  12000,
);
await go("#resumen");
await check("Gastado");
const data = await page.evaluate(() => reportData(today().slice(0, 7)));
assert.equal(data.spent, 8000);
assert.equal(data.pendingClasses, 15000);
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Descargar CSV / Excel" }).click();
const download = await downloadPromise;
const csv = readFileSync(await download.path(), "utf8");
assert.ok(csv.includes("Electricidad"));
assert.ok(csv.includes("Camila Torres Actualizada"));
await page.evaluate(() => {
  const end = shiftDays(today(), -90),
    start = addMonths(end, -1);
  state.customers.push({
    id: "qa-regreso",
    name: "Marcos Acosta",
    phone: "+54 9 11 0000 0000",
    instagram: "@marcos.entrena",
    marketingOptIn: true,
    activityId: "musculacion",
    activityName: "Musculación",
    price: 20000,
    start,
    end,
    payments: [{ method: "Efectivo", amount: 10000, date: start }],
    createdAt: start,
    unit: "months",
    count: 1,
    history: [],
  });
  save();
});
await go("#campanas");
await page.locator('input[name="comm-recipient"][value="qa-regreso"]').check();
await page.getByRole("button", { name: "Preparar mensajes privados" }).click();
await page.waitForURL(/comunicaciones\/historial/);
await check("Preparado · Sin enviar");
assert.equal(await page.evaluate(() => state.campaigns.length), 1);
const past = await page.evaluate(() =>
  state.customers.find((c) => c.id === "qa-regreso").start.slice(0, 7),
);
await go(`#resumen/${past}`);
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Cerrar y conservar resumen" }).click();
const frozen = await page.evaluate(
  (month) => JSON.stringify(state.monthlyClosings[month].data),
  past,
);
await go("#abonar/qa-regreso");
await page.locator("#pay-amount").fill("10000");
await page.getByRole("button", { name: "Guardar abono" }).click();
assert.equal(
  await page.evaluate(
    (month) => JSON.stringify(state.monthlyClosings[month].data),
    past,
  ),
  frozen,
);
mkdirSync("/tmp/shelby-qa-screenshots", { recursive: true });
for (const width of [375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of [
    "#clientes",
    "#actividades",
    "#gastos",
    "#resumen",
    "#campanas",
    `#clase/${julian}/-1`,
  ]) {
    await go(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `Sin overflow a ${width}px en ${route}`);
  }
  await page.screenshot({
    path: `/tmp/shelby-qa-screenshots/demo-campanas-${width}.png`,
    fullPage: true,
  });
}
assert.deepEqual(errors, [], "Sin errores JS");
await browser.close();
console.log(
  "OK: demo responsive, Instagram, actividades por clases/ofertas, asistencia y correcciones, sorteo congelado, alta posterior, gastos mixtos, recurrencia, CSV, cierres y campañas.",
);
