import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
test("comunicaciones: navegación responsive, privacidad, revisión y permisos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.getByRole("link", { name: "Mensajes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Comunicaciones", exact: true }),
  ).toBeVisible();
  const seedName = await page
    .locator(".campaign-person strong")
    .filter({ hasText: "Martín QA" })
    .first()
    .innerText();
  await page
    .getByLabel("Buscar por nombre, celular o Instagram")
    .fill(seedName);
  await page.getByRole("button", { name: "Seleccionar habilitados" }).click();
  await expect(page.locator(".message-preview")).toContainText(seedName);
  await page
    .getByLabel("Mensaje personalizado")
    .fill("Hola {nombre}, tenemos una propuesta para volver. {oferta}");
  await page
    .getByLabel("Oferta para esta campaña")
    .fill("Consultá nuestro nuevo plan");
  await page.getByRole("button", { name: /Preparar 1 mensajes/ }).click();
  await expect(page).toHaveURL(/seccion=historial/);
  await expect(page.locator("p.notice[role=status]")).toContainText(
    "No se enviaron",
  );
  await expect(
    page.locator(".operation-panel").filter({ hasText: seedName }).first(),
  ).toContainText("Hola " + seedName);
  await page.goto("/comunicaciones?seccion=canales");
  await page
    .getByLabel("Nombre del gimnasio", { exact: true })
    .fill("Shelby en revisión");
  await page.getByLabel("Número exclusivo de WhatsApp").fill("1122");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.locator(".operation-form [role=alert]")).toContainText(
    "internacional",
  );
  await expect(
    page.getByLabel("Nombre del gimnasio", { exact: true }),
  ).toHaveValue("Shelby en revisión");
  await expect(page.getByLabel("Número exclusivo de WhatsApp")).toHaveValue(
    "1122",
  );
  await page
    .getByLabel("Nombre del gimnasio", { exact: true })
    .fill("Shelby Gym");
  await page.getByLabel("Número exclusivo de WhatsApp").fill("");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.locator("p.notice[role=status]")).toContainText(
    "guardados",
  );
  mkdirSync("qa-artifacts/communications", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of [
      "campanas",
      "plantillas",
      "automatizaciones",
      "canales",
      "historial",
    ]) {
      await page.goto(`/comunicaciones?seccion=${section}`);
      await expect(page.locator("h1")).toHaveText("Comunicaciones");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${section} ${width}`,
      ).toBe(true);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `qa-artifacts/communications/app-${section}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.goto("/comunicaciones?seccion=campanas");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.goto("/campanas");
  await expect(page).toHaveURL(/comunicaciones\?seccion=campanas/);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await page.getByLabel("Correo electrónico").fill(env.E2E_MONITOR_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env.E2E_MONITOR_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(
    page.getByRole("link", { name: "Mensajes", exact: true }),
  ).toHaveCount(0);
  await page.goto("/comunicaciones");
  await expect(page).toHaveURL(/\/clientes$/);
  expect(errors).toEqual([]);
});
