import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL || "",
  )
)
  throw Error("Solo QA local con datos ficticios.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const session = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
const suffix = randomUUID(),
  email = `password-${suffix}@example.test`,
  initial = "Initial-" + randomUUID(),
  changed = "Changed-" + randomUUID(),
  activated = "Activated-" + randomUUID();
const { data, error } = await admin.auth.admin.createUser({
  email,
  password: initial,
  email_confirm: true,
});
assert.equal(error, null, "Crear identidad QA");
const id = data.user.id;
let server, browser;
try {
  assert.equal(
    (
      await admin
        .from("staff")
        .insert({ id, name: "Dueño de prueba de acceso", role: "owner" })
    ).error,
    null,
  );
  const previous = session();
  assert.equal(
    (await previous.auth.signInWithPassword({ email, password: initial }))
      .error,
    null,
  );
  server = spawn("pnpm", ["start", "--port", "3001"], {
    cwd: process.cwd(),
    env: { ...process.env, GYM_OWNER_LOGIN_EMAIL: email },
    detached: true,
    stdio: "ignore",
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3001/login")).ok) break;
    } catch {}
    if (i === 79) throw Error("No arrancó el servidor de QA.");
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3001/login");
  await expect(page.getByLabel("Correo electrónico")).toHaveCount(0);
  await page.getByLabel("Contraseña", { exact: true }).fill("Incorrecta-2026");
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "No pudimos iniciar sesión",
  );
  await page.getByLabel("Contraseña", { exact: true }).fill(initial);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("http://127.0.0.1:3001/ajustes");
  await expect(
    page.getByRole("heading", { name: "Contraseña de acceso" }),
  ).toBeVisible();
  await page
    .getByLabel("Contraseña actual", { exact: true })
    .fill("Actual incorrecta");
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(changed);
  await page
    .getByLabel("Repetir nueva contraseña", { exact: true })
    .fill(changed);
  await page
    .getByRole("button", { name: "Cambiar contraseña", exact: true })
    .click();
  await expect(page.locator(".operation-form [role=alert]")).toContainText(
    "La contraseña actual no es correcta",
  );
  await page.getByLabel("Contraseña actual", { exact: true }).fill(initial);
  await page
    .getByRole("button", { name: "Cambiar contraseña", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?clave=actualizada$/);
  const oldAccess = await previous.from("staff").select("id");
  assert.equal(oldAccess.error, null);
  assert.deepEqual(
    oldAccess.data,
    [],
    "Sesión anterior no debe leer datos aunque conserve JWT",
  );
  assert.ok(
    (
      await previous.rpc("configure_gym", {
        p_currency: "ARS",
        p_time_zone: "America/Argentina/Buenos_Aires",
      })
    ).error,
    "Sesión revocada no puede ejecutar RPC",
  );
  assert.ok(
    (await session().auth.signInWithPassword({ email, password: initial }))
      .error,
    "Clave anterior debe fallar",
  );
  assert.equal(
    (await session().auth.signInWithPassword({ email, password: changed }))
      .error,
    null,
    "Clave nueva debe entrar",
  );
  await page.getByLabel("Contraseña", { exact: true }).fill(changed);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("http://127.0.0.1:3001/ajustes");
  mkdirSync("qa-artifacts/password", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Overflow ${width}`,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `qa-artifacts/password/settings-${width}.png`,
        fullPage: true,
      });
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    audit.violations.map((v) => v.id),
    [],
    "Accesibilidad ajustes",
  );
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  const generated = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  assert.equal(generated.error, null);
  const token = generated.data.properties.hashed_token;
  await page.goto(
    "http://127.0.0.1:3001/activar#token_hash=" + encodeURIComponent(token),
  );
  await page.getByRole("button", { name: /Elegir mi contraseña/ }).click();
  assert.ok(!page.url().includes(token), "El fragmento se retira de la URL");
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(activated);
  await page
    .getByLabel("Repetir nueva contraseña", { exact: true })
    .fill("Otra contraseña larga");
  await page.getByRole("button", { name: "Guardar mi contraseña" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("no coinciden");
  await page
    .getByLabel("Repetir nueva contraseña", { exact: true })
    .fill(activated);
  await page.getByRole("button", { name: "Guardar mi contraseña" }).click();
  await expect(page).toHaveURL(/\/login\?clave=activada$/);
  assert.equal(
    (await session().auth.signInWithPassword({ email, password: activated }))
      .error,
    null,
    "Contraseña elegida en activación",
  );
  await page.goto(
    "http://127.0.0.1:3001/activar#token_hash=" + encodeURIComponent(token),
  );
  await page.getByRole("button", { name: /Elegir mi contraseña/ }).click();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(changed);
  await page
    .getByLabel("Repetir nueva contraseña", { exact: true })
    .fill(changed);
  await page.getByRole("button", { name: "Guardar mi contraseña" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "venció o ya fue utilizado",
  );
  assert.equal(
    (await session().auth.signInWithPassword({ email, password: activated }))
      .error,
    null,
    "Reusar enlace no altera clave",
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: acceso sin correo, rechazo de clave incorrecta, cambio con clave actual, cierre global y RLS de JWT revocado, activación de un solo uso, responsive y accesibilidad. Solo QA local.",
  );
} finally {
  if (browser) await browser.close();
  if (server?.pid)
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  await admin.from("staff").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
}
