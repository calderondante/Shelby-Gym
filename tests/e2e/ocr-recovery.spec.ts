import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  !/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error("Solo QA local");
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/clientes/nuevo");
  await page.locator(".registration-photo > summary").click();
}
async function photo(browser: Browser) {
  const source = await browser.newPage({
    viewport: { width: 1200, height: 800 },
  });
  await source.setContent(
    '<html><body style="background:white;color:black;margin:70px;font:38px Arial;line-height:1.7"><h1>SHELBY GYM</h1><p>Nombre y apellido: Ana Gómez<br>Teléfono: +54 9 11 4567 8901<br>Fecha de nacimiento: 15/04/1992</p></body></html>',
  );
  const buffer = await source.screenshot();
  await source.close();
  return { name: "ficha-prueba.png", mimeType: "image/png", buffer };
}
test("fallo del modelo OCR recupera controles, termina worker y permite reintentar", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await login(page);
  const input = page.getByLabel("Elegir foto de inscripción");
  const capture = page.locator(".registration-photo");
  const image = await photo(browser);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/ocr/spa.traineddata.gz", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
  await input.setInputFiles(image);
  await expect(capture.getByRole("status")).toContainText("No pudimos", {
    timeout: 30_000,
  });
  await expect(input).toBeEnabled();
  await expect(capture.locator(".invoice-preview")).toHaveCount(0);
  await page.unroute("**/ocr/spa.traineddata.gz");
  await input.setInputFiles(image);
  await expect(
    capture.getByLabel("Nombre y apellido en la foto", { exact: true }),
  ).toHaveValue("Ana Gómez", { timeout: 90_000 });
  expect(errors).toEqual([]);
});
test("cancelar, timeout y salir durante inicio OCR liberan la lectura sin perder el formulario", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await page
    .getByLabel("Nombre y apellido", { exact: true })
    .fill("Conservar datos");
  const image = await photo(browser);
  const capture = page.locator(".registration-photo");
  const input = page.getByLabel("Elegir foto de inscripción");
  // Abort the worker script request only after the user has cancelled/unmounted;
  // the worker must stop immediately even if the network never answers.
  let release: (() => void) | undefined;
  await page.route("**/ocr/worker.min.js", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.abort().catch(() => {});
  });
  let started = page.waitForRequest("**/ocr/worker.min.js");
  await input.setInputFiles(image);
  await started;
  await capture
    .getByRole("button", { name: "Cancelar lectura", exact: true })
    .click();
  await expect(input).toBeEnabled({ timeout: 3000 });
  await expect(capture.getByRole("status")).toContainText("Lectura cancelada");
  await expect(
    page.getByLabel("Nombre y apellido", { exact: true }),
  ).toHaveValue("Conservar datos");
  release?.();
  await page.clock.install();
  started = page.waitForRequest("**/ocr/worker.min.js");
  await input.setInputFiles(image);
  await started;
  await page.clock.fastForward(120_001);
  await expect(input).toBeEnabled();
  await expect(capture.getByRole("status")).toContainText("a tiempo");
  release?.();
  started = page.waitForRequest("**/ocr/worker.min.js");
  await input.setInputFiles(image);
  await started;
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Actividades", exact: true })
    .click();
  await expect(page).toHaveURL(/\/actividades$/);
  release?.();
  await page.unroute("**/ocr/worker.min.js");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Clientes", exact: true })
    .click();
  await page.getByRole("link", { name: "Nuevo cliente", exact: true }).click();
  await page.locator(".registration-photo > summary").click();
  await page.getByLabel("Elegir foto de inscripción").setInputFiles(image);
  await expect(
    page
      .locator(".registration-photo")
      .getByLabel("Nombre y apellido en la foto", { exact: true }),
  ).toHaveValue("Ana Gómez", { timeout: 60_000 });
});
