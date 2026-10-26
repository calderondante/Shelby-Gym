import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("manifest público, iconos reales e instrucciones accesibles de instalación", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/clientes");
  expect(manifest.scope).toBe("/");
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.status()).toBe(200);
    const png = await asset.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
  }
  const worker = await request.get("/sw.js");
  expect(worker.status()).toBe(200);
  expect(worker.headers()["content-type"]).toContain("javascript");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
  const apple = await request.get(
    (await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")) ??
      "",
  );
  expect(apple.status()).toBe(200);
  await page.getByText("Instalar Shelby Gym", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Instalar Shelby Gym" }),
  ).toContainText("Añadir a pantalla de inicio");
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  mkdirSync("qa-artifacts/pwa", { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "qa-artifacts/pwa/install-390.png",
    fullPage: true,
  });
});

test("botón usa la confirmación del navegador y admite posponer la instalación", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByText("Instalar Shelby Gym", { exact: true }).click();
  // Synthetic browser event: verifies our handoff, not the native OS installer.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: () => {
        document.documentElement.dataset.installPrompted = "yes";
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Instalar en este dispositivo" })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-install-prompted",
    "yes",
  );
  await expect(
    page
      .getByRole("region", { name: "Instalar Shelby Gym" })
      .getByRole("status"),
  ).toContainText("más adelante");
  await expect(
    page.getByRole("button", { name: "Instalar en este dispositivo" }),
  ).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("region", { name: "Instalar Shelby Gym" }),
  ).toHaveCount(0);
});

test("sin internet no expone fichas ni confirma operaciones, y vuelve al acceso al reconectar", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.goto("/clientes?qa=offline", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "No hay conexión." }),
  ).toBeVisible();
  await expect(
    page.getByText("Esta pantalla no guarda ni confirma operaciones.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await context.setOffline(false);
  await page.getByRole("link", { name: "Volver a intentar" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Entrar al gimnasio" }),
  ).toBeVisible();
});
