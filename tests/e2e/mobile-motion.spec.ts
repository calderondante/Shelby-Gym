import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import AxeBuilder from "@axe-core/playwright";
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}

test("navegación al alcance del pulgar, foco visible y contenido sin obstrucciones", async ({
  page,
}) => {
  await login(page);
  mkdirSync("qa-artifacts/motion", { recursive: true });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/clientes/nuevo");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav).toBeVisible();
    await expect(nav).toHaveCSS("position", width < 768 ? "fixed" : "static");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      await page.locator(".workspace-footer").scrollIntoViewIfNeeded();
      const bounds = await nav.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
      expect(bounds!.y).toBeGreaterThan(700);
      const links = nav.getByRole("link");
      for (const link of await links.all()) {
        const rect = await link.boundingBox();
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        expect(rect!.width).toBeGreaterThanOrEqual(44);
      }
      await page
        .getByRole("button", {
          name: "Crear cliente y registrar abono",
          exact: true,
        })
        .focus();
      const button = await page
        .getByRole("button", {
          name: "Crear cliente y registrar abono",
          exact: true,
        })
        .boundingBox();
      expect(button!.y + button!.height).toBeLessThanOrEqual(bounds!.y);
    }
    if (width === 390 || width === 1440) {
      await page.goto("/clientes");
      await page.screenshot({
        path: `qa-artifacts/motion/clientes-${width}.png`,
        fullPage: false,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("envío estable, error enfocado y teclado/movimiento reducido sin desplazamientos", async ({
  page,
}) => {
  await login(page);
  await page.goto("/actividades/nueva");
  await page
    .getByLabel("Nombre de la actividad o plan")
    .fill("Actividad de prueba de validación");
  const price = page.getByLabel("Precio habitual");
  await price.fill("incorrecto");
  const submit = page.getByRole("button", {
    name: "Crear actividad",
    exact: true,
  });
  const before = await submit.boundingBox();
  let release: () => void = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/actividades/nueva", async (route) => {
    if (route.request().method() === "POST") await hold;
    await route.continue();
  });
  try {
    await submit.click();
    const pending = page.getByRole("button", {
      name: "Guardando…",
      exact: true,
    });
    await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute("aria-busy", "true");
    const during = await pending.boundingBox();
    expect(Math.abs(before!.width - during!.width)).toBeLessThan(1);
    expect(Math.abs(before!.height - during!.height)).toBeLessThan(1);
    await expect(page.locator(".form-feedback[role=alert]")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator(".form-feedback[role=alert]")).toBeVisible();
  await expect(price).toBeFocused();
  await expect(price).toHaveValue("incorrecto");
  await expect(page.getByLabel("Nombre de la actividad o plan")).toHaveValue(
    "Actividad de prueba de validación",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-input", "keyboard");
  await expect(submit).toHaveCSS("transition-duration", "0s");
  await expect(submit).toHaveCSS("transform", "none");
});

test("barra móvil se aparta del teclado simulado y respeta el zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/clientes/nuevo");
  await page.getByLabel("Nombre y apellido").focus();
  await page.evaluate(() => {
    if (!visualViewport)
      throw new Error("VisualViewport requerido para esta simulación");
    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      value: innerHeight - 300,
    });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open");
  await expect(page.locator(".primary-nav")).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(visualViewport!, "scale", {
      configurable: true,
      value: 2,
    });
    visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".primary-nav")).toBeVisible();
});
