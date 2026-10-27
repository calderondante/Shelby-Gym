import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error("Solo QA local");
async function login(page: Page, role = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
test("bandeja de facturas, revisión persistente, configuración y acceso restringido", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.locator(".notification-bell").click();
  await expect(
    page.getByRole("heading", { name: "Avisos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Revisión", exact: true })
    .selectOption("all");
  const card = page.locator("article").filter({
    has: page.locator(`a[href$="#gasto-${qa.E2E_ALERT_EXPENSE_ID}"]`),
  });
  await expect(card).toContainText("Factura pendiente de prueba");
  if (
    await card
      .getByRole("button", { name: "Marcar sin revisar", exact: true })
      .count()
  )
    await card
      .getByRole("button", { name: "Marcar sin revisar", exact: true })
      .click();
  await card
    .getByRole("button", { name: "Marcar revisado", exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: "Marcar sin revisar", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Revisión", exact: true })
    .selectOption("all");
  await expect(
    card.getByRole("button", { name: "Marcar sin revisar", exact: true }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Marcar sin revisar", exact: true })
    .click();
  await page.getByText("Preferencias de vencimiento", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar preferencias" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preferencias guardadas" }),
  ).toBeVisible();
  mkdirSync("qa-artifacts/owner-alerts", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: "qa-artifacts/owner-alerts/inbox-390.png",
        fullPage: true,
      });
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  const context = await browser.newContext(),
    other = await context.newPage();
  await login(other, "MONITOR");
  await expect(other.locator(".notification-bell")).toHaveCount(0);
  await other.goto("/avisos");
  await expect(other).toHaveURL(/\/clientes$/);
  const denied = await other.request.get("/api/owner-alerts", {
    maxRedirects: 0,
  });
  expect(denied.status()).toBe(307);
  await context.close();
});
test("foto real: OCR en el dispositivo, revisión obligatoria, descarte y guardado de datos sin imagen", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const number = "00004-" + randomInt(10000000, 99999999),
    due = qa.E2E_ALERT_DUE!,
    printed = due.split("-").reverse().join("/");
  const source = await browser.newPage({
    viewport: { width: 1200, height: 1200 },
  });
  await source.setContent(
    `<html><body style="margin:80px;background:white;color:black;font:34px Arial"><h1 style="font-size:52px">ELECTRO DEL SUR</h1><p>Factura B Nro. ${number}</p><p>Fecha de emision: 20/10/2026</p><hr><p>Servicio de electricidad</p><p>Subtotal $ 103.306,20</p><p>IVA $ 21.694,30</p><h2 style="font-size:48px">TOTAL A PAGAR $ 125.000,50</h2><p style="font-size:42px">Vencimiento: ${printed}</p><hr><p>Documento de prueba sin valor fiscal</p></body></html>`,
  );
  const photo = await source.screenshot({ fullPage: true });
  await source.close();
  const sent: string[] = [];
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      new URL(r.url()).origin === "http://127.0.0.1:3000"
    )
      sent.push(r.postData() ?? "");
  });
  await login(page);
  await page.goto("/historial/gastos");
  await page.getByText("Nuevo gasto", { exact: true }).click();
  const capture = page.locator(".invoice-capture:visible");
  await capture
    .getByText("Registrar una factura con foto", { exact: true })
    .click();
  await expect(capture.getByLabel("Tomar foto de factura")).toHaveAttribute(
    "capture",
    "environment",
  );
  await capture.getByLabel("Elegir foto de factura").setInputFiles({
    name: "factura-prueba.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await expect(capture.getByLabel("Importe total detectado")).toHaveValue(
    "125000,50",
    { timeout: 90_000 },
  );
  await expect(capture.getByLabel("Vencimiento detectado")).toHaveValue(due);
  await expect(
    capture.getByLabel("Proveedor o servicio detectado"),
  ).toHaveValue(/ELECTRO DEL SUR/i);
  const use = capture.getByRole("button", {
    name: "Usar estos datos y descartar foto",
  });
  await expect(use).toBeDisabled();
  // Keep the manual review explicit even when the OCR recognizes the test receipt correctly.
  await capture.getByLabel("Número de factura detectado").fill(number);
  await capture
    .getByRole("checkbox", { name: "Revisé el importe y el vencimiento." })
    .check();
  await use.click();
  await expect(capture.locator(".invoice-preview")).toHaveCount(0);
  await expect(capture).toContainText("falta guardar el gasto");
  const form = page
    .locator("form")
    .filter({ has: page.locator('input[name="operation"][value="expense"]') })
    .filter({ has: page.locator('input[name="id"][value=""]') });
  await expect(form.locator('input[name="supplier"]')).toHaveValue(
    /ELECTRO DEL SUR/i,
  );
  await expect(form.locator('input[name="amount"]')).toHaveValue("125000,50");
  await form
    .getByRole("button", { name: "Registrar gasto", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/historial/gastos\\?mes=" + due.slice(0, 7)),
  );
  const owner = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  expect(
    (
      await owner.auth.signInWithPassword({
        email: qa.E2E_OWNER_EMAIL!,
        password: qa.E2E_OWNER_PASSWORD!,
      })
    ).error,
  ).toBeNull();
  const saved = await owner
    .from("expenses")
    .select("supplier,invoice_number,total_cents,due_on")
    .eq("invoice_number", number)
    .single();
  expect(saved.error).toBeNull();
  expect(saved.data).toMatchObject({
    invoice_number: number,
    total_cents: 12500050,
    due_on: due,
  });
  await owner.auth.signOut({ scope: "local" });
  expect(
    sent.every(
      (body) =>
        !body.includes("factura-prueba.png") &&
        !body.includes("data:image/") &&
        !body.includes("base64,"),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  const databases = await page.evaluate(() => indexedDB.databases());
  expect(
    databases.some((d) => d.name?.toLowerCase().includes("tesseract")),
  ).toBe(false);
});
