import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  !/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw new Error("Solo QA local.");
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));

test("navegación da feedback mientras espera la red y conserva acceso fresco", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.route("**/actividades*", async (route) => {
    if (
      route.request().headers().rsc &&
      !route.request().headers()["next-router-prefetch"]
    )
      await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  const activities = page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Actividades", exact: true });
  await activities.click();
  await expect(
    page.locator('a[href="/actividades"] .nav-pending'),
  ).toHaveAttribute("data-pending", "true");
  await expect(
    page.getByText("Abriendo Actividades…", { exact: true }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Actividades", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Abriendo Actividades…", { exact: true }),
  ).toHaveCount(0);
  const response = await page.request.get("/comunicaciones?seccion=canales");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["content-security-policy"]).toContain("script-src");
});

test("precarga la siguiente pantalla, actualiza cambios de otro equipo y limpia acceso al salir", async ({
  page,
}) => {
  const owner = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  expect(
    (
      await owner.auth.signInWithPassword({
        email: qa.E2E_OWNER_EMAIL!,
        password: qa.E2E_OWNER_PASSWORD!,
      })
    ).error,
  ).toBeNull();
  const name = `Movilidad de prueba ${randomUUID().slice(0, 8)}`;
  try {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill(qa.E2E_OWNER_PASSWORD!);
    const prefetch = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/actividades" &&
        r.request().headers().rsc === "1" &&
        !r.request().headers()["next-router-segment-prefetch"] &&
        !r.request().headers()["next-router-prefetch"] &&
        r.ok(),
    );
    await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    const prepared = await prefetch;
    await expect
      .poll(() =>
        page.evaluate(
          (url) =>
            performance
              .getEntriesByName(url)
              .some((e) => (e as PerformanceResourceTiming).responseEnd > 0),
          prepared.url(),
        ),
      )
      .toBe(true);
    await expect(page.locator(".live-sync [role=status]")).toHaveText(
      "En vivo",
    );
    const refreshed = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/clientes" &&
        r.request().headers().rsc === "1" &&
        !r.request().headers()["next-router-prefetch"] &&
        r.ok(),
    );
    expect(
      (
        await owner.rpc("save_activity", {
          p_id: null,
          p_revision: 0,
          p_data: {
            name,
            description: "Solo QA local",
            price_cents: 100000,
            offer_price_cents: null,
            offer_label: "",
            duration_count: 1,
            duration_unit: "months",
            active: true,
          },
        })
      ).error,
    ).toBeNull();
    await refreshed;
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Actividades", exact: true })
      .click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Entrar al gimnasio" }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Entrar al gimnasio" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Actividades", exact: true }),
    ).toHaveCount(0);
  } finally {
    await owner.auth.signOut({ scope: "local" });
  }
});
