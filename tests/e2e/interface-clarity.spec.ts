import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import AxeBuilder from "@axe-core/playwright";
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
test("selección visible, resumen desplegable y gastos comprensibles en cinco tamaños", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  mkdirSync("qa-artifacts/interface-clarity", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, selected] of [
      ["/clientes/nuevo", "Alta de hoy"],
      ["/clientes/nuevo?origen=papel", "Cargar desde papel"],
      ["/comunicaciones", "Preparar mensaje"],
      ["/historial", "Resumen"],
      ["/historial/gastos", "Gastos"],
    ]) {
      await page.goto(route);
      const active = page
        .locator(
          '.operation-tabs a[aria-current="page"], .communication-tabs a[aria-current="page"]',
        )
        .filter({ hasText: selected })
        .first();
      await expect(active).toBeVisible();
      await expect(active).toHaveCSS("background-color", "rgb(250, 250, 250)");
      await expect(active).toHaveCSS("color", "rgb(23, 23, 23)");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (route === "/historial") {
        const history = page.locator(".summary-history");
        await expect(history).not.toHaveAttribute("open");
        await history.locator(":scope > summary").click();
        await expect(
          page.getByRole("heading", { name: "Día a día", exact: true }),
        ).toBeVisible();
      }
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `qa-artifacts/interface-clarity/${route.includes("papel") ? "paper" : route.replaceAll("/", "-").replaceAll("?", "-")}-${width}.png`,
          fullPage: true,
        });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
  await page.goto("/comunicaciones");
  await expect(
    page
      .getByRole("navigation", { name: "Secciones de mensajes" })
      .getByRole("link"),
  ).toHaveCount(3);
  await expect(page.getByLabel("Canal", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("¿A quién querés escribirle?")).toHaveValue(
    "selected",
  );
  await page.goto("/historial/gastos");
  const filters = page.getByRole("navigation", { name: "Estado de gastos" });
  await expect(
    filters.getByRole("link", { name: /^Por pagar/ }),
  ).toHaveAttribute("aria-current", "page");
  await filters.getByRole("link", { name: /^Pagados/ }).click();
  await expect(filters.getByRole("link", { name: /^Pagados/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("Registrar pago", { exact: true })).toHaveCount(
    0,
  );
});
test("iPhone sin instalar explica cómo recibir avisos con la app cerrada", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await login(page);
  await page.goto("/avisos");
  await expect(
    page.getByRole("heading", { name: "Notificaciones con la app cerrada" }),
  ).toBeVisible();
  await expect(
    page.getByText("Activar en iPhone o iPad", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(/Compartir → Añadir a pantalla de inicio/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Activar notificaciones", exact: true }),
  ).toHaveCount(0);
  await context.close();
});

test("el historial sigue abierto al cambiar de día y conserva el mes", async ({
  page,
}) => {
  await login(page);
  await page.goto("/historial?mes=2026-10");
  const history = page.locator(".summary-history");
  await history.locator(":scope > summary").click();
  await page.locator(".ledger-day-rail a:not([aria-current])").first().click();
  await expect(page).toHaveURL(/mes=2026-10.*dia=2026-10-/);
  await expect(history).toHaveAttribute("open", "");
  await expect(
    page.locator('.ledger-day-rail a[aria-current="date"]'),
  ).toHaveCSS("background-color", "rgb(250, 250, 250)");
});
