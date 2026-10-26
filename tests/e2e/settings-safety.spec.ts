import { test, expect } from "@playwright/test";
import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
test("los ajustes no cambian el día de los cobros ya registrados", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/ajustes");
  await page.getByLabel("Zona horaria").fill("UTC");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "Cambiar la zona horaria alteraría las fechas del historial",
  );
  await page.reload();
  await expect(page.getByLabel("Zona horaria")).toHaveValue(
    "America/Argentina/Buenos_Aires",
  );
});
