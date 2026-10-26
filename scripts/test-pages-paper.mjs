import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
const base = process.env.PAGES_BASE_URL || "http://127.0.0.1:4173/gestion/";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.clock.setFixedTime(new Date("2026-10-26T15:00:00Z"));
await page.goto(base);
await page.locator("#pin").fill("SHELBY26");
await page.getByRole("button", { name: "Abrir Shelby Gym" }).click();
const go = async (hash, ready) => {
  await page.goto(`${base}#${hash}`);
  if (ready) await page.locator(ready).first().waitFor();
};
const received = () =>
  page.evaluate(() => allPayments().reduce((n, p) => n + p.amount, 0));
const baseline = await received();
await go("nuevo", "#customer-form");
await page.getByRole("link", { name: "Cargar desde papel" }).click();
await page.locator("#paper-form").waitFor();
async function fill(
  name,
  total,
  paid,
  start = "2026-07-11",
  end = "2026-08-11",
  activity = "musculacion",
) {
  await go("nuevo/papel", "#paper-form");
  await page.locator("#paper-name").fill(name);
  await page.locator("#paper-activity").selectOption(activity);
  await page.locator("#paper-start").fill(start);
  await page.locator("#paper-start").dispatchEvent("change");
  if (end !== null) await page.locator("#paper-end").fill(end);
  await page.locator("#paper-total").fill(String(total));
  await page.locator("#paper-paid").fill(String(paid));
}
async function save() {
  await page
    .getByRole("button", { name: "Guardar registro del papel" })
    .click();
  await expect(page.locator("#paper-form")).toHaveCount(0);
  return page.url().split("#cliente/")[1];
}
await fill("Celia Ríos", 25000, 18000);
const celia = await save();
assert.equal(await received(), baseline);
assert.equal(
  await page.evaluate(
    (id) => balance(state.customers.find((c) => c.id === id)),
    celia,
  ),
  7000,
);
assert.match(await page.locator("#main").innerText(), /18.000/);
await page.reload();
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).start,
    celia,
  ),
  "2026-07-11",
);
await fill("Luis Benítez", 40000, 30000, "2026-09-11", "2026-10-11");
await page.getByRole("button", { name: "Añadir pago anterior" }).click();
await page.getByLabel("Fecha del pago anterior").fill("2026-09-11");
await page.getByLabel("Transferencia", { exact: true }).fill("15000");
await page.getByLabel("Efectivo", { exact: true }).fill("5000");
const luis = await save();
assert.equal(await received(), baseline + 20000);
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).openingPaid,
    luis,
  ),
  10000,
);
assert.equal(
  await page.evaluate(
    () =>
      allPayments().filter(
        (p) =>
          p.date === today() &&
          ["Celia Ríos", "Luis Benítez"].includes(p.customerName),
      ).length,
  ),
  0,
);
await fill("Marta Solís", 25000, 0);
const marta = await save();
assert.equal(
  await page.evaluate(
    (id) => balance(state.customers.find((c) => c.id === id)),
    marta,
  ),
  25000,
);
await fill("Lucía Fernández", 30000, 30000, "2026-10-11", "2026-11-11");
const lucia = await save();
assert.equal(
  await page.evaluate(
    (id) => status(state.customers.find((c) => c.id === id))[0],
    lucia,
  ),
  "Al día",
);
await go("actividad-nueva", "#activity-form");
await page.locator("#activity-name").fill("Clases históricas");
await page.locator("#activity-price").fill("60000");
await page.locator("#activity-unit").selectOption("sessions");
await page.locator("#activity-months").fill("3");
await page.getByRole("button", { name: "Guardar actividad" }).click();
await expect(page.locator("#activity-form")).toHaveCount(0);
const activity = await page.evaluate(
  () => state.activities.find((a) => a.name === "Clases históricas").id,
);
await fill("Pedro Castro", 30000, 20000, "2026-09-11", null, activity);
await page.locator("#paper-used").fill("2");
const pedro = await save();
assert.equal(
  await page.evaluate(
    (id) => remainingClasses(state.customers.find((c) => c.id === id)),
    pedro,
  ),
  1,
);
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).sessionEvents.length,
    pedro,
  ),
  0,
);
await go(`clase/${pedro}/-1`, "#session-form");
await page.locator("#session-debt").check();
await page.getByRole("button", { name: "Registrar clase realizada" }).click();
await expect(page.locator("#session-form")).toHaveCount(0);
await go(`regresar/${celia}`, "#return-form");
await page.locator("#return-activity").selectOption("musculacion");
await page.locator("#return-amount").fill("10000");
await page.getByRole("button", { name: "Confirmar nueva cuota" }).click();
await expect(page.locator("#return-form")).toHaveCount(0);
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).openingPaid,
    celia,
  ),
  0,
);
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).history[0].openingPaid,
    celia,
  ),
  18000,
);
await go(`abonar/${celia}/0`, "#pay-form");
await page.locator("#pay-amount").fill("7000");
await page.getByRole("button", { name: "Guardar abono" }).click();
await expect(page.locator("#pay-form")).toHaveCount(0);
assert.equal(await received(), baseline + 37000);
assert.equal(
  await page.evaluate(
    (id) => state.customers.find((c) => c.id === id).history[0].end,
    celia,
  ),
  "2026-08-11",
);
mkdirSync("qa-artifacts/paper", { recursive: true });
for (const width of [375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await fill("Verificación visual", 25000, 18000);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `Formulario ${width}`,
  );
  if (width === 390 || width === 1440)
    await page.screenshot({
      path: `qa-artifacts/paper/demo-form-${width}.png`,
      fullPage: true,
    });
  await go(`cliente/${celia}`, ".profile-management");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `Perfil ${width}`,
  );
}
await go("nuevo/papel", "#paper-form");
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
await go("resumen/2026-07", "#close-report");
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Cerrar y conservar resumen" }).click();
await fill("No modifica el cierre", 25000, 18000);
const before = await page.evaluate(() => state.customers.length);
await page.getByRole("button", { name: "Guardar registro del papel" }).click();
await expect(page.locator("#paper-form")).toBeVisible();
assert.equal(await page.evaluate(() => state.customers.length), before);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "OK demo papel: vencido/vigente, sin abono, monto previo sin ingresos ficticios, medios históricos, pack usado, regreso sin arrastrar crédito a la cuota nueva, deuda antigua, persistencia, cierre protegido, responsive y accesibilidad.",
);
