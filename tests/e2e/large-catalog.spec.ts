import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.local", "utf8"));
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error("Solo QA local");
test("catálogo de más de 200 clientes conserva paginación, búsqueda y acceso móvil", async ({
  page,
}) => {
  const label = `CatalogoQA${Date.now()}`;
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      process.env.SUPABASE_TEST_DB_CONTAINER || "supabase_db_shelby-gym",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `insert into public.customers(name,created_by) select '${label} ' || n, (select id from public.staff where role='owner' and active limit 1) from generate_series(1,200) n;`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  const countText = await page.locator(".list-meta").innerText();
  expect(Number(countText.match(/(\d+) clientes/)?.[1])).toBeGreaterThanOrEqual(
    200,
  );
  expect(await page.locator(".customer-row").count()).toBeLessThanOrEqual(50);
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("textbox", { name: "Buscar por nombre", exact: true })
    .fill(label);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".list-meta")).toContainText("200 clientes");
  mkdirSync("qa-artifacts/large-catalog", { recursive: true });
  await page.screenshot({
    path: "qa-artifacts/large-catalog/clients-1440.png",
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
});
