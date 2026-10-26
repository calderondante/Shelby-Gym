import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
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
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.locator("#pin").fill("SHELBY26");
await page.getByRole("button", { name: "Abrir Shelby Gym" }).click();
await page.evaluate(() => {
  const old = addMonths(today(), -4),
    ends = addMonths(old, 1);
  for (const [id, name, consent] of [
    ["comms-ana", "Ana López", true],
    ["comms-martin", "Martín Ríos", true],
    ["comms-sin-permiso", "Sin permiso", false],
  ])
    state.customers.push({
      id,
      name,
      phone: "+5491112345678",
      instagram: "@ana",
      marketingOptIn: consent,
      instagramMarketingOptIn: false,
      activityName: "Musculación",
      start: old,
      end: ends,
      price: 30000,
      unit: "months",
      count: 1,
      payments: [{ date: old, amount: 20000, method: "Efectivo" }],
      history: [],
      createdAt: old,
    });
  save();
});
const go = async (section) => {
  await page.goto(`${base}#comunicaciones/${section}`);
  await page.locator(".comm-tabs").waitFor();
};
await go("campanas");
await page
  .getByLabel("Buscar por nombre, celular o Instagram")
  .fill("Sin permiso");
assert.equal(await page.locator('[name="comm-recipient"]').isDisabled(), true);
await page
  .getByLabel("Buscar por nombre, celular o Instagram")
  .fill("Ana López");
await page.getByRole("button", { name: "Seleccionar habilitados" }).click();
await page
  .getByLabel("Buscar por nombre, celular o Instagram")
  .fill("Martín Ríos");
await page.getByRole("button", { name: "Seleccionar habilitados" }).click();
await page
  .getByLabel("Oferta para esta campaña")
  .fill("Consultá por nuestro plan de regreso");
assert.match(
  await page.locator("#comm-preview-body").innerText(),
  /Hola Ana López/,
);
await page.getByRole("button", { name: "Preparar mensajes privados" }).click();
await page.waitForURL(/comunicaciones\/historial/);
assert.equal(await page.locator(".ops-item").count(), 2);
assert.match(
  await page.locator(".ops-item").first().innerText(),
  /Martín Ríos/,
);
assert.match(await page.locator(".ops-item").first().innerText(), /Sin enviar/);
await page.reload();
assert.equal(await page.locator(".ops-item").count(), 2);
await go("campanas");
await page.getByLabel("Canal", { exact: true }).selectOption("instagram");
await page
  .getByLabel("Buscar por nombre, celular o Instagram")
  .fill("Ana López");
assert.equal(await page.locator('[name="comm-recipient"]').isDisabled(), true);
await go("duenos");
await page.getByLabel("Nombre", { exact: true }).fill("Lucía");
await page.getByLabel("Celular internacional").fill("+54 9 11 2345 6789");
await page.getByRole("button", { name: "Agregar dueño", exact: true }).click();
await page.evaluate(() => {
  state.expenses.push({
    id: "comms-expense",
    title: "Luz",
    amount: 42000,
    dueOn: today(),
    payments: [{ amount: 12000 }],
    templateId: "fixture-recurring",
  });
  save();
});
await go("automatizaciones");
const bills = page
  .locator("article")
  .filter({
    has: page.getByRole("heading", { name: "Boletas para los dueños" }),
  });
await bills.getByLabel("Habilitar la preparación").check();
await bills.getByRole("button", { name: "Guardar regla" }).click();
await page.getByRole("button", { name: "Revisar avisos de hoy" }).click();
await page.waitForURL(/comunicaciones\/historial/);
assert.match(await page.locator(".ops-item").first().innerText(), /Lucía/);
assert.match(await page.locator(".ops-item").first().innerText(), /30.000/);
const count = await page.locator(".ops-item").count();
await go("automatizaciones");
await page.getByRole("button", { name: "Revisar avisos de hoy" }).click();
await page.waitForURL(/comunicaciones\/historial/);
assert.equal(await page.locator(".ops-item").count(), count);
await page.evaluate(() => {
  state.expenses
    .find((e) => e.id === "comms-expense")
    .payments.push({ amount: 30000 });
  save();
});
await go("automatizaciones");
await page.getByRole("button", { name: "Revisar avisos de hoy" }).click();
await page.waitForURL(/comunicaciones\/historial/);
assert.match(await page.locator(".ops-item").first().innerText(), /Cancelado/);
mkdirSync("qa-artifacts/communications", { recursive: true });
for (const width of [375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const section of [
    "campanas",
    "plantillas",
    "automatizaciones",
    "duenos",
    "canales",
    "historial",
  ]) {
    await go(section);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Overflow ${section} ${width}`,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `qa-artifacts/communications/demo-${section}-${width}.png`,
        fullPage: true,
      });
  }
}
await go("campanas");
const axe = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
assert.deepEqual(
  axe.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target),
  })),
  [],
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "OK demo: selección privada, consentimiento por canal, personalización, persistencia, boletas parciales/pagadas, deduplicación, responsive y accesibilidad.",
);
