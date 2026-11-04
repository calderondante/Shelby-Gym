import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
test("un refresco conserva el identificador y borrador del gasto", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/historial/gastos");
  await page.getByText("Nuevo gasto", { exact: true }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Registrar gasto", exact: true }),
  });
  const id = await form.locator("input[name=requestId]").inputValue();
  await form.getByLabel("Concepto", { exact: true }).fill("Conservar borrador");
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(form.locator("input[name=requestId]")).toHaveValue(id);
  await expect(form.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Conservar borrador",
  );
});

test("dos gastos consecutivos reciben identidades diferentes tras confirmar", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/historial/gastos");
  let previous = "";
  for (let i = 0; i < 2; i++) {
    const detail = page
      .locator("details")
      .filter({
        has: page.locator("summary").filter({ hasText: /^Nuevo gasto$/ }),
      })
      .first();
    await detail.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    const form = detail.locator("form");
    const id = await form.locator("input[name=requestId]").inputValue();
    expect(id).not.toBe(previous);
    previous = id;
    const name = `Gasto consecutivo QA ${Date.now()}-${i}`;
    await form.getByLabel("Concepto", { exact: true }).fill(name);
    await form.getByLabel("Importe (ARS)").fill("100");
    await form
      .getByRole("button", { name: "Registrar gasto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
});
