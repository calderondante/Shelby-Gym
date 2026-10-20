import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const env = parseEnv(readFileSync(".env.test.local", "utf8"));
test("packs, Instagram, asistencia con deuda y resumen de gastos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(env.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/actividades/nueva");
  const activity = `Particulares ${Date.now()}`;
  await page.getByLabel("Nombre de la actividad o plan").fill(activity);
  await page.getByLabel("Precio habitual").fill("30000");
  await page.getByLabel("Duración", { exact: true }).fill("3");
  await page.getByLabel("Unidad").selectOption("sessions");
  await page.getByRole("button", { name: "Crear actividad" }).click();
  await expect(page).toHaveURL(/\/actividades\?guardado/);
  await expect(
    page
      .locator("li")
      .filter({
        has: page.getByRole("heading", { name: activity, exact: true }),
      })
      .getByText("3 clases · sin vencimiento"),
  ).toBeVisible();
  await page.goto("/clientes/nuevo");
  const name = `Camila Torres ${Date.now()}`;
  await page.getByLabel("Nombre y apellido").fill(name);
  await page.getByLabel("Instagram (opcional)").fill("@camila.entrena");
  const optionId = await page
    .getByLabel("Actividad o plan")
    .locator("option")
    .filter({ hasText: activity })
    .getAttribute("value");
  await page.getByLabel("Actividad o plan").selectOption(optionId!);
  await page.getByLabel("Efectivo", { exact: true }).fill("10000");
  await page
    .getByRole("button", { name: "Crear cliente y registrar abono" })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "@camila.entrena" }),
  ).toBeVisible();
  await expect(
    page.getByText("3 de 3 clases disponibles · sin vencimiento"),
  ).toBeVisible();
  await page
    .getByLabel("Confirmo la asistencia aunque el pack tenga saldo pendiente.")
    .check();
  await page.getByRole("button", { name: "Registrar clase realizada" }).click();
  await expect(
    page.getByText("2 de 3 clases disponibles · sin vencimiento"),
  ).toBeVisible();
  await page
    .getByLabel("Confirmo la asistencia aunque el pack tenga saldo pendiente.")
    .check();
  await page.getByRole("button", { name: "Registrar clase realizada" }).click();
  await expect(
    page.getByText("1 de 3 clases disponibles · sin vencimiento"),
  ).toBeVisible();
  await page
    .getByText("Clases y correcciones registradas", { exact: true })
    .click();
  await page.getByText("Corregir asistencia", { exact: true }).first().click();
  await page
    .getByLabel("Motivo de corrección")
    .first()
    .fill("Asistencia duplicada");
  await page
    .getByRole("button", { name: "Corregir y devolver clase" })
    .first()
    .click();
  await expect(
    page.getByText("2 de 3 clases disponibles · sin vencimiento"),
  ).toBeVisible();
  const expenseName = `Servicio de limpieza ${Date.now()}`;
  await page.goto("/historial/gastos");
  await page.getByText("Nuevo gasto", { exact: true }).click();
  const expenseForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Registrar gasto", exact: true }),
  });
  await expenseForm.getByLabel("Concepto", { exact: true }).fill(expenseName);
  await expenseForm.getByLabel("Importe (ARS)").fill("incorrecto");
  await expenseForm
    .getByRole("button", { name: "Registrar gasto", exact: true })
    .click();
  await expect(expenseForm.getByRole("alert")).toBeVisible();
  await expect(expenseForm.getByLabel("Concepto", { exact: true })).toHaveValue(
    expenseName,
  );
  await expect(expenseForm.getByLabel("Importe (ARS)")).toHaveValue(
    "incorrecto",
  );
  await expenseForm.getByLabel("Importe (ARS)").fill("10000");
  await expenseForm
    .getByRole("button", { name: "Registrar gasto", exact: true })
    .click();
  const article = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: expenseName,
        exact: true,
      }),
    })
    .first();
  await article.getByText("Registrar pago", { exact: true }).click();
  await article.getByLabel("Efectivo", { exact: true }).fill("3000");
  await article.getByLabel("Transferencia", { exact: true }).fill("2000");
  await article
    .getByRole("button", { name: "Registrar pago del gasto" })
    .click();
  await expect(article.getByText(/Pago parcial/)).toBeVisible();
  await page.goto("/historial/resumen?version=actual");
  await expect(
    page.getByRole("heading", { name: "Gastos y correcciones" }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar CSV / Excel" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/shelby-.*-actual.csv/);
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/historial/gastos",
      "/historial/resumen?version=actual",
      "/campanas",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} a ${width}px`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
