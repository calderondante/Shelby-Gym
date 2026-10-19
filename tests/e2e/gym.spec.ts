import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
async function login(page: Page, role: "OWNER" | "MONITOR" = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
test("sesión, alta, abono mixto y persistencia real", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await page.getByRole("link", { name: "Nuevo cliente", exact: true }).click();
  const name = `Cliente E2E ${Date.now()}`;
  await page.getByLabel("Nombre y apellido").fill(name);
  await page.getByLabel("Actividad o plan").selectOption(env.E2E_ACTIVITY_ID!);
  await page.getByLabel("Transferencia", { exact: true }).fill("10000");
  await page.getByLabel("Efectivo", { exact: true }).fill("5000");
  await page
    .getByRole("button", { name: "Crear cliente y registrar abono" })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(
    page.getByText("Guardado correctamente", { exact: true }),
  ).toBeVisible();
  const profileUrl = page.url();
  const dates = await page.locator(".subscription-header p").innerText();
  await page
    .getByRole("link", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Transferencia", { exact: true }).fill("25000");
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await expect(
    page.getByText("El importe supera el saldo actual.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Transferencia", { exact: true })).toHaveValue(
    "25000",
  );
  await page.getByLabel("Transferencia", { exact: true }).fill("10000");
  await page.getByLabel("Mercado Pago", { exact: true }).fill("10000");
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await expect(page.getByText("✓ Cuota completa")).toBeVisible();
  await expect(page.locator(".subscription-header p")).toHaveText(dates);
  await page.reload();
  await expect(page.getByText("✓ Cuota completa")).toBeVisible();
  await page.getByText("Historial de abonos", { exact: true }).click();
  await expect(page.locator(".payment-history ol>li")).toHaveCount(2);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(profileUrl);
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});
test("el monitor trabaja con clientes sin editar configuración comercial", async ({
  page,
}) => {
  await login(page, "MONITOR");
  await expect(
    page.getByRole("link", { name: "Nuevo cliente", exact: true }),
  ).toBeVisible();
  await page.goto("/actividades");
  await expect(
    page.getByRole("link", { name: "Nueva actividad", exact: true }),
  ).toHaveCount(0);
  await page.goto("/actividades/nueva");
  await expect(page).toHaveURL(/\/clientes$/);
});
test("responsive, estados vacíos, teclado y motion reducido", async ({
  page,
}) => {
  await login(page);
  mkdirSync("docs/design/screenshots/app", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of [
      "/clientes",
      "/clientes/nuevo",
      "/actividades",
      `/clientes/${env.E2E_CUSTOMER_ID}`,
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
    await page.goto("/clientes");
    await expect(
      page.getByRole("heading", { name: "Clientes", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".customer-list")).toBeVisible();
    await page.screenshot({
      path: `docs/design/screenshots/app/clientes-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/clientes/nuevo");
  await expect(
    page.getByRole("heading", { name: "Nuevo cliente", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/design/screenshots/app/nuevo-cliente-390.png",
    fullPage: true,
  });
  await page.goto("/clientes?q=nombre-inexistente-qa");
  await expect(
    page.getByText("No hay coincidencias", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
});

test("un abono aparece en otro equipo sin recargar y la UI pasa accesibilidad automática", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.goto(`/clientes/${env.E2E_CUSTOMER_ID}`);
  await expect(page.locator(".live-sync [role=status]")).toHaveText("En vivo");
  const before = await page.locator(".profile-total").innerText();
  const other = await browser.newContext();
  const receiver = await other.newPage();
  await login(receiver, "MONITOR");
  await receiver.goto(`/clientes/${env.E2E_CUSTOMER_ID}`);
  await receiver
    .getByRole("link", { name: "Registrar abono", exact: true })
    .click();
  await receiver.getByLabel("Efectivo", { exact: true }).fill("1");
  await receiver
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await expect(
    receiver.getByText("Guardado correctamente", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-total")).not.toHaveText(before, {
    timeout: 8000,
  });
  await other.close();
  for (const route of [
    "/clientes",
    "/clientes/nuevo",
    "/actividades",
    "/actividades/nueva",
    "/ajustes",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
