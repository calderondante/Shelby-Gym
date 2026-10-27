import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
const qa = parseEnv(readFileSync(".env.test.local", "utf8")),
  env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error("Solo datos sintéticos locales.");
async function login(page: Page, role = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
async function photo(
  browser: Browser,
  history?: { start: string; end: string },
) {
  const source = await browser.newPage({
    viewport: { width: 1500, height: 1450 },
  });
  const date = (v: string) => v.split("-").reverse().join("/");
  await source.setContent(
    `<html><body style="background:white;color:black;margin:70px;font:38px Arial;line-height:1.7"><h1 style="font-size:54px">SHELBY GYM</h1><h2 style="font-size:42px">Ficha de inscripción</h2><p>Nombre y apellido: Ana Gómez<br>Teléfono: +54 9 11 4567 8901<br>Instagram: @ana.gomez<br>Correo: ana@example.test<br>Fecha de nacimiento: 15/04/1992</p>${history ? `<p>Actividad: Musculación<br>Inicio: ${date(history.start)}<br>Vencimiento: ${date(history.end)}<br>Importe pactado: $ 25.000,00<br>Total ya abonado: $ 18.000,00</p>` : ""}<p>Firma: No importar<br>Datos médicos: No importar<br>Acepta ofertas: sí</p></body></html>`,
  );
  const buffer = await source.screenshot({ fullPage: true });
  await source.close();
  return { name: "ficha-prueba.png", mimeType: "image/png", buffer };
}
test("cámara integrada: OCR real, revisión, datos escritos conservados y sin alta automática", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await page.goto("/clientes/nuevo");
  await page
    .getByLabel("Nombre y apellido", { exact: true })
    .fill("Nombre ingresado manualmente");
  await page.getByText("Correo y nota (opcionales)", { exact: true }).click();
  await page
    .getByLabel("Nota de recepción (opcional)")
    .fill("Conservar esta nota");
  const posts: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().startsWith("http://127.0.0.1:3000"))
      posts.push(r.postData() ?? "");
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const capture = page.locator(".registration-photo");
  await capture.locator("summary").click();
  await expect(capture.getByLabel("Tomar foto de inscripción")).toHaveAttribute(
    "capture",
    "environment",
  );
  await capture
    .getByLabel("Elegir foto de inscripción")
    .setInputFiles(await photo(browser));
  // A field completed while the worker is reading must also be protected.
  await page
    .getByLabel("Teléfono (opcional)", { exact: true })
    .fill("1199998888");
  await expect(
    capture.getByLabel("Nombre y apellido en la foto", { exact: true }),
  ).toHaveValue("Ana Gómez", { timeout: 90_000 });
  await expect(
    capture.getByLabel("Mes de cumpleaños en la foto", { exact: true }),
  ).toHaveValue("4");
  await expect(
    capture.getByRole("checkbox", {
      name: "Usar Nombre y apellido de la foto",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    capture.getByRole("checkbox", {
      name: "Usar Teléfono de la foto",
      exact: true,
    }),
  ).toBeDisabled();
  const apply = capture.getByRole("button", {
    name: "Aplicar datos y descartar foto",
  });
  await expect(apply).toBeDisabled();
  mkdirSync("qa-artifacts/registration-photo", { recursive: true });
  await capture
    .getByRole("checkbox", { name: "Usar Instagram de la foto", exact: true })
    .check();
  await capture
    .getByRole("checkbox", { name: "Usar Correo de la foto", exact: true })
    .check();
  // The OCR may confuse @ with Q: exercise the required human correction.
  await capture
    .getByLabel("Instagram en la foto", { exact: true })
    .fill("@ana.gomez");
  await capture
    .getByLabel("Correo en la foto", { exact: true })
    .fill("ana@example.test");
  await capture
    .getByRole("checkbox", {
      name: "Permitir reemplazar los campos ya completados que seleccione",
    })
    .check();
  await expect(
    capture.getByRole("checkbox", {
      name: "Usar Nombre y apellido de la foto",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    capture.getByRole("checkbox", {
      name: "Usar Teléfono de la foto",
      exact: true,
    }),
  ).not.toBeChecked();
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440)
      await capture.screenshot({
        path: `qa-artifacts/registration-photo/review-${width}.png`,
      });
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  await capture
    .getByRole("checkbox", {
      name: "Revisé los datos seleccionados para esta inscripción.",
    })
    .check();
  await apply.click();
  await expect(
    page.getByLabel("Nombre y apellido", { exact: true }),
  ).toHaveValue("Nombre ingresado manualmente");
  await expect(
    page.getByLabel("Teléfono (opcional)", { exact: true }),
  ).toHaveValue("1199998888");
  await expect(
    page.getByLabel("Instagram (opcional)", { exact: true }),
  ).toHaveValue("@ana.gomez");
  await expect(
    page.getByLabel("Correo (opcional)", { exact: true }),
  ).toHaveValue("ana@example.test");
  await expect(
    page.getByLabel("Mes de cumpleaños (opcional)", { exact: true }),
  ).toHaveValue("4");
  await expect(page.getByLabel("Nota de recepción (opcional)")).toHaveValue(
    "Conservar esta nota",
  );
  await expect(page.locator("#marketingOptIn")).not.toBeChecked();
  await expect(page.locator("#instagramMarketingOptIn")).not.toBeChecked();
  await expect(capture.locator(".invoice-preview")).toHaveCount(0);
  await expect(capture).toContainText("falta completar y guardar");
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  expect(
    (await page.evaluate(() => indexedDB.databases())).some((d) =>
      d.name?.toLowerCase().includes("tesseract"),
    ),
  ).toBe(false);
});
test("foto de registro histórico: actividad confirmada, revisión financiera y saldo sin cobro de hoy", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  expect(
    (
      await db.auth.signInWithPassword({
        email: qa.E2E_OWNER_EMAIL!,
        password: qa.E2E_OWNER_PASSWORD!,
      })
    ).error,
  ).toBeNull();
  try {
    const closings = await db.from("monthly_closings").select("month");
    expect(closings.error).toBeNull();
    let start = "";
    for (let n = 1; n < 60; n++) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - n, 1);
      const candidate = d.toISOString().slice(0, 10);
      if (!closings.data!.some((c) => c.month === candidate)) {
        start = candidate;
        break;
      }
    }
    expect(start).not.toBe("");
    const end = start.slice(0, 8) + "20";
    await login(page);
    await page.goto("/clientes/nuevo?origen=papel");
    const capture = page.locator(".registration-photo");
    await capture.locator("summary").click();
    await capture
      .getByLabel("Elegir foto de inscripción")
      .setInputFiles(await photo(browser, { start, end }));
    await expect(
      capture.getByLabel("Importe pactado (ARS) en la foto", { exact: true }),
    ).toHaveValue("25000,00", { timeout: 90_000 });
    await expect(
      capture.getByLabel("Total ya abonado (ARS) en la foto", { exact: true }),
    ).toHaveValue("18000,00");
    await expect(page.locator("#paper-start")).toHaveValue("");
    await expect(page.locator("#paper-total")).toHaveValue("");
    await expect(page.locator("#paper-paid")).toHaveValue("0");
    await capture
      .getByRole("checkbox", {
        name: "Permitir reemplazar los campos ya completados que seleccione",
      })
      .check();
    await capture
      .getByLabel("Actividad en la foto", { exact: true })
      .selectOption(qa.E2E_ACTIVITY_ID!);
    for (const name of [
      "Actividad",
      "Inicio de la cuota o pack",
      "Vencimiento anotado",
      "Importe pactado (ARS)",
      "Total ya abonado (ARS)",
    ])
      await capture
        .getByRole("checkbox", { name: `Usar ${name} de la foto`, exact: true })
        .check();
    await capture
      .getByRole("checkbox", {
        name: "Revisé los datos seleccionados para esta inscripción.",
      })
      .check();
    const apply = capture.getByRole("button", {
      name: "Aplicar datos y descartar foto",
    });
    await expect(apply).toBeDisabled();
    await capture
      .getByRole("checkbox", {
        name: "Revisé la actividad, las fechas y los importes históricos seleccionados. No son un cobro de hoy.",
      })
      .check();
    await apply.click();
    await expect(page.locator("#paper-activity")).toHaveValue(
      qa.E2E_ACTIVITY_ID!,
    );
    await expect(page.locator("#paper-start")).toHaveValue(start);
    await expect(page.locator("#paper-end")).toHaveValue(end);
    await expect(page.locator("#paper-total")).toHaveValue("25000,00");
    await expect(page.locator("#paper-paid")).toHaveValue("18000,00");
    // Keep the normal form editable after applying the selected scan values.
    await page
      .getByLabel("Nombre y apellido", { exact: true })
      .fill("Ana Gómez");
    await page
      .getByRole("button", { name: "Guardar registro del papel" })
      .click();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+(?:\?|$)/);
    const customerId = new URL(page.url()).pathname.split("/").at(-1)!;
    const period = await db
      .from("subscription_balances")
      .select(
        "id,starts_on,ends_on,total_cents,opening_paid_cents,balance_cents",
      )
      .eq("customer_id", customerId)
      .single();
    expect(period.error).toBeNull();
    expect(period.data).toMatchObject({
      starts_on: start,
      ends_on: end,
      total_cents: 2500000,
      opening_paid_cents: 1800000,
      balance_cents: 700000,
    });
    const payments = await db
      .from("payment_batches")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", period.data!.id);
    expect(payments.error).toBeNull();
    expect(payments.count).toBe(0);
  } finally {
    await db.auth.signOut({ scope: "local" });
  }
});
test("monitor conserva registro normal: cancelar una lectura no toca el formulario", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await login(page, "MONITOR");
  await page.goto("/clientes/nuevo");
  await expect(
    page.getByRole("link", { name: "Cargar desde papel" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Nombre y apellido", { exact: true })
    .fill("Datos conservados");
  const capture = page.locator(".registration-photo");
  await capture.locator("summary").click();
  await capture
    .getByLabel("Elegir foto de inscripción")
    .setInputFiles(await photo(browser));
  await capture
    .getByRole("button", { name: "Cancelar lectura", exact: true })
    .click();
  await expect(capture.getByRole("status")).toContainText("Lectura cancelada", {
    timeout: 90_000,
  });
  await expect(capture.locator(".invoice-preview")).toHaveCount(0);
  await expect(
    page.getByLabel("Nombre y apellido", { exact: true }),
  ).toHaveValue("Datos conservados");
  await page.goto("/clientes/nuevo?origen=papel");
  await expect(page).toHaveURL(/\/clientes\/nuevo$/);
});
