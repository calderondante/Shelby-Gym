import { test, expect, type Page } from "@playwright/test";
import { parseEnv } from "node:util";
import { readFileSync, mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { createWorkbook } from "../../src/features/imports/domain/template";
import { columns } from "../../src/features/imports/domain/contracts";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
async function login(page: Page, role = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
test("Excel: lectura real, revisión, precios históricos, pagos mixtos y reimportación", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.getByRole("link", { name: "Importar Excel", exact: true }).click();
  const name = `Cliente importado ${Date.now()}`;
  const file = {
    name: "historial.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(
      createWorkbook([
        columns.map(([, label]) => label),
        [
          "001",
          name,
          31,
          "",
          "",
          "febrero",
          "Musculación",
          "11/02/2026",
          "11/03/2026",
          20000,
          0,
          "p1",
          "11/02/2026",
          "efectivo",
          10000,
        ],
        [
          "001",
          name,
          31,
          "",
          "",
          "febrero",
          "Musculación",
          "11/02/2026",
          "11/03/2026",
          20000,
          0,
          "p1",
          "11/02/2026",
          "transferencia",
          10000,
        ],
        [
          "001",
          name,
          31,
          "",
          "",
          "marzo",
          "Musculación",
          "11/03/2026",
          "11/04/2026",
          30000,
          5000,
          "p2",
          "11/03/2026",
          "Mercado Pago",
          10000,
        ],
      ]),
    ),
  };
  await page.getByLabel("Archivo Excel").setInputFiles(file);
  await expect(
    page.getByRole("heading", { name: "Cada columna, en su lugar." }),
  ).toBeVisible();
  await page.getByLabel("Origen de los datos").fill(name);
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const mappingAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mappingAxe.violations.map((v) => v.id)).toEqual([]);
  // Activity names may repeat in independent QA runs; choose the exact fixture ID.
  await page.locator("#activity-0").selectOption(env.E2E_ACTIVITY_ID!);
  await page
    .getByRole("button", { name: "Revisar importación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Todo claro antes de continuar." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Todo claro antes de continuar." }),
  ).toBeInViewport();
  await expect(page.getByText(/ya abonados sin detalle/)).toBeVisible();
  mkdirSync("docs/design/screenshots/import", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `docs/design/screenshots/import/revision-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
  }
  const reviewAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(reviewAxe.violations.map((v) => v.id)).toEqual([]);
  await page.getByText("1 pagos anteriores · ver detalle").first().click();
  await expect(page.getByText(/Efectivo ·/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importar 1 cliente", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Importar 1 cliente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu historia sigue acá." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver clientes", exact: true }).click();
  await page.goto(`/clientes?q=${encodeURIComponent(name)}`);
  await page.locator(".customer-row").click();
  await expect(page.getByText(/31 años/)).toBeVisible();
  await expect(page.locator(".subscription")).toHaveCount(2);
  await expect(page.locator(".profile-total")).toContainText("5.000");
  await page.getByText("Historial de abonos", { exact: true }).first().click();
  await expect(page.getByText(/Pago histórico/).first()).toBeVisible();
  await page.goto("/clientes/importar");
  await page.getByLabel("Archivo Excel").setInputFiles(file);
  await expect(page.locator("#import-source")).toBeVisible();
  await page.getByLabel("Origen de los datos").fill(name);
  await page.locator("#activity-0").selectOption(env.E2E_ACTIVITY_ID!);
  await page
    .getByRole("button", { name: "Revisar importación", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finalizar sin duplicar" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("importación responsive, accesible, teclado y reducción de movimiento", async ({
  page,
}) => {
  await login(page);
  mkdirSync("docs/design/screenshots/import", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/clientes/importar");
    await expect(
      page.getByRole("button", { name: "Elegir archivo Excel" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".live-sync [role=status]")).toHaveText(
      "En vivo",
    );
    await page.screenshot({
      path: `docs/design/screenshots/import/excel-${width}.png`,
      fullPage: true,
    });
  }
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const button = page.getByRole("button", { name: "Elegir archivo Excel" });
  await button.focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.documentElement.dataset.input),
  ).toBe("keyboard");
});
test("monitor no puede acceder a importación masiva", async ({ page }) => {
  await login(page, "MONITOR");
  await expect(page.getByRole("link", { name: "Importar Excel" })).toHaveCount(
    0,
  );
  await page.goto("/clientes/importar");
  await expect(page).toHaveURL(/\/clientes$/);
});

test("archivo inválido conserva el control y movimiento respeta preferencias", async ({
  page,
}) => {
  await login(page);
  await page.goto("/clientes/importar");
  await page.getByLabel("Archivo Excel").setInputFiles({
    name: "corrupto.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("not an xlsx"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Elegir archivo Excel" }),
  ).toBeEnabled();
  const button = page.getByRole("button", { name: "Elegir archivo Excel" });
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 20, box!.y + 20);
  await page.mouse.down();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await button.evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe("none");
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(box!.x + 20, box!.y + 20);
  await page.mouse.down();
  expect(await button.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
  await page.mouse.move(0, 0);
  await page.mouse.up();
});
