import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
test("los avisos agrupan ráfagas, evitan solicitudes paralelas y recuperan conexión", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/avisos");
  await expect(
    page.getByRole("heading", { name: "Avisos", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1600); // Let the existing delayed badge initialization settle.
  const counts = { summary: 0, full: 0 };
  const active = { summary: 0, full: 0 };
  const peak = { summary: 0, full: 0 };
  await page.route("**/api/owner-alerts*", async (route) => {
    const key = route.request().url().includes("summary") ? "summary" : "full";
    counts[key]++;
    active[key]++;
    peak[key] = Math.max(peak[key], active[key]);
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
    active[key]--;
  });
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++)
      window.dispatchEvent(new Event("shelby:alerts-refresh"));
  });
  await expect.poll(() => counts.full).toBe(1);
  await expect.poll(() => counts.summary).toBe(1);
  await page.waitForTimeout(1000);
  expect(counts).toEqual({ summary: 1, full: 1 });
  expect(peak).toEqual({ summary: 1, full: 1 });
  await context.setOffline(true);
  await expect(page.locator(".live-sync")).toContainText("Sin conexión");
  await page.evaluate(() =>
    window.dispatchEvent(new Event("shelby:alerts-refresh")),
  );
  await page.waitForTimeout(800);
  expect(counts).toEqual({ summary: 1, full: 1 });
  await context.setOffline(false);
  await expect.poll(() => counts.full).toBeGreaterThan(1);
  await expect.poll(() => counts.summary).toBeGreaterThan(1);
});
