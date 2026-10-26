import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
const qa = parseEnv(readFileSync(".env.test.local", "utf8")),
  env = parseEnv(readFileSync(".env.local", "utf8"));
async function login(page: Page, role: "OWNER" | "MONITOR" = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
async function openMonth() {
  if (
    !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
      env.NEXT_PUBLIC_SUPABASE_URL || "",
    )
  )
    throw Error("Solo QA local.");
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const auth = await db.auth.signInWithPassword({
    email: qa.E2E_OWNER_EMAIL!,
    password: qa.E2E_OWNER_PASSWORD!,
  });
  expect(auth.error).toBeNull();
  const closed = await db.from("monthly_closings").select("month");
  expect(closed.error).toBeNull();
  for (let n = 1; n < 60; n++) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - n, 1);
    const start = date.toISOString().slice(0, 10);
    if (!closed.data!.some((c) => c.month === start))
      return { db, start, end: start.slice(0, 8) + "20" };
  }
  throw Error("No hay mes de prueba abierto.");
}
test("cargar un vencido desde papel conserva fecha, monto y deuda sin generar un cobro hoy", async ({
  page,
}) => {
  const { db, start, end } = await openMonth(),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.goto("/clientes/nuevo");
  await page.getByRole("link", { name: "Cargar desde papel" }).click();
  await expect(
    page.getByRole("heading", { name: "Lo que figura en el papel" }),
  ).toBeVisible();
  const name = `Registro de cuaderno ${Date.now()}`;
  await page.getByLabel("Nombre y apellido").fill(name);
  await page.getByLabel("Actividad o plan").selectOption(qa.E2E_ACTIVITY_ID!);
  await page.getByLabel("Inicio de la cuota", { exact: true }).fill(start);
  await page.getByLabel("Vencimiento anotado").fill(end);
  await page.getByLabel("Importe pactado en el papel").fill("25000");
  await page.getByLabel("Total que ya había abonado").fill("30000");
  await page
    .getByRole("button", { name: "Guardar registro del papel" })
    .click();
  await expect(page.locator("#paper-paid-error")).toContainText(
    "Lo abonado no puede superar",
  );
  await expect(page.getByLabel("Nombre y apellido")).toHaveValue(name);
  await expect(
    page.getByLabel("Inicio de la cuota", { exact: true }),
  ).toHaveValue(start);
  await page.getByLabel("Total que ya había abonado").fill("18000");
  await page
    .getByRole("button", { name: "Guardar registro del papel" })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const id = page.url().split("/clientes/")[1].split("?")[0],
    profile = page.url();
  await expect(page.locator(".profile-total")).toContainText("7.000");
  await expect(page.locator(".subscription-header")).toContainText("Vencida");
  const periods = await db
    .from("subscription_balances")
    .select("*")
    .eq("customer_id", id);
  expect(periods.error).toBeNull();
  expect(periods.data![0].starts_on).toBe(start);
  expect(periods.data![0].ends_on).toBe(end);
  expect(periods.data![0].total_cents).toBe(2500000);
  expect(periods.data![0].opening_paid_cents).toBe(1800000);
  expect(
    (
      await db
        .from("payment_batches")
        .select("id")
        .eq("subscription_id", periods.data![0].id!)
    ).data,
  ).toEqual([]);
  await page
    .getByRole("link", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Transferencia", { exact: true }).fill("7000");
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await expect(page.getByText("✓ Cuota completa")).toBeVisible();
  await page.goto(profile);
  await expect(page.locator(".profile-total")).toContainText("0,00");
  expect(
    (
      await db
        .from("subscription_balances")
        .select("ends_on")
        .eq("customer_id", id)
    ).data![0].ends_on,
  ).toBe(end);
  expect(errors).toEqual([]);
});
test("pagos históricos opcionales, packs usados y formulario responsive accesible", async ({
  page,
}) => {
  const { db, start, end } = await openMonth();
  await login(page);
  await page.goto("/clientes/nuevo?origen=papel");
  const name = `Pagos del cuaderno ${Date.now()}`;
  await page.getByLabel("Nombre y apellido").fill(name);
  await page.getByLabel("Actividad o plan").selectOption(qa.E2E_ACTIVITY_ID!);
  await page.getByLabel("Inicio de la cuota", { exact: true }).fill(start);
  await page.getByLabel("Vencimiento anotado").fill(end);
  await page.getByLabel("Importe pactado en el papel").fill("40000");
  await page.getByLabel("Total que ya había abonado").fill("30000");
  await page.getByRole("button", { name: "Añadir pago anterior" }).click();
  await page.getByLabel("Fecha del pago anterior").fill(start);
  await page.getByLabel("Transferencia", { exact: true }).fill("15000");
  await page.getByLabel("Efectivo", { exact: true }).fill("5000");
  await page
    .getByRole("button", { name: "Guardar registro del papel" })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator(".profile-total")).toContainText("10.000");
  const id = page.url().split("/clientes/")[1].split("?")[0];
  expect(
    (
      await db
        .from("subscription_balances")
        .select("opening_paid_cents")
        .eq("customer_id", id)
    ).data![0].opening_paid_cents,
  ).toBe(1000000);
  const pack = await db
    .from("activities")
    .select("id")
    .eq("duration_unit", "sessions")
    .eq("active", true)
    .limit(1);
  expect(pack.error).toBeNull();
  await page.goto("/clientes/nuevo?origen=papel");
  await page.getByLabel("Actividad o plan").selectOption(pack.data![0].id);
  await expect(page.getByLabel("Clases ya usadas")).toBeVisible();
  await expect(page.getByLabel("Vencimiento anotado")).toHaveCount(0);
  await page.getByLabel("Clases ya usadas").fill("2");
  await page.getByLabel("Inicio del pack", { exact: true }).fill(start);
  mkdirSync("qa-artifacts/paper", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Papel ${width}`,
    ).toBe(true);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `qa-artifacts/paper/app-form-${width}.png`,
        fullPage: true,
      });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      elements: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("el monitor mantiene altas de hoy y no incorpora historia sin permiso", async ({
  page,
}) => {
  await login(page, "MONITOR");
  await page.goto("/clientes/nuevo?origen=papel");
  await expect(page).toHaveURL(/\/clientes\/nuevo$/);
  await expect(
    page.getByRole("link", { name: "Cargar desde papel" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Crear cliente y registrar abono" }),
  ).toBeVisible();
});
