import { test, expect } from "@playwright/test";
import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
test("una respuesta perdida no asegura que el abono no se guardó", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/clientes/nuevo");
  await page
    .getByLabel("Nombre y apellido")
    .fill(`Prueba de conexión ${Date.now()}`);
  await page.getByLabel("Actividad o plan").selectOption(env.E2E_ACTIVITY_ID!);
  await page.getByLabel("Efectivo", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Crear cliente y registrar abono" })
    .click();
  await expect(page.locator(".profile-total")).toBeVisible();
  const profile = page.url();
  await page
    .getByRole("link", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Transferencia", { exact: true }).fill("500");
  let committedResponse = false;
  await page.route("**/clientes/*/abonar**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    committedResponse = true;
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await expect(page.locator(".error-view")).toContainText(
    "Consultá el historial antes de volver a cargarlo",
  );
  expect(committedResponse).toBe(true);
  await page.unrouteAll({ behavior: "wait" });
  await page.goto(profile);
  await expect(page.locator(".profile-total")).toBeVisible();
  await page.getByText("Historial de abonos", { exact: true }).click();
  await expect(page.locator(".payment-history ol>li")).toHaveCount(2);
  await expect(page.locator(".payment-history")).toContainText("500");
});
