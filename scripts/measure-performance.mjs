/**
 * Controlled, read-only benchmark against a PRODUCTION BUILD and synthetic local DB.
 * Usage: node scripts/measure-performance.mjs --label=before --samples=3
 * Optional: --sections=ssr,browser,journeys --profiles=fast,mobile --routes=clients,profile
 * Run before and after against the SAME fixture database, Node/Chromium and server process mode.
 * Auth state stays in memory. Reports contain timings/counts, not cookies, keys, names or records.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import { performance } from "node:perf_hooks";
import { cpus, totalmem, platform, arch } from "node:os";

const args = Object.fromEntries(
  process.argv.slice(2).map((s) => {
    const [key, ...value] = s.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
const label = args.label ?? "baseline";
if (!/^[a-z0-9-]{1,50}$/i.test(label)) throw Error("Label inválido.");
const samples = Number(args.samples ?? 3);
if (!Number.isInteger(samples) || samples < 1 || samples > 10)
  throw Error("samples: 1–10");
const env = parseEnv(readFileSync(".env.local", "utf8"));
const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
const base = args.base ?? "http://127.0.0.1:3000";
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base) ||
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error(
    "Benchmark autenticado permitido solamente contra app y Supabase locales.",
  );
if (!existsSync(".next/BUILD_ID"))
  throw Error("Primero generar build de producción; no medir next dev.");
const sections = new Set((args.sections ?? "ssr,browser,journeys").split(","));
const profileNames = new Set((args.profiles ?? "fast,mobile").split(","));
const selectedRoutes = args.routes ? new Set(args.routes.split(",")) : null;
const proxyMetrics = args.metrics ?? "";
if (
  proxyMetrics &&
  !/^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(proxyMetrics)
)
  throw Error("Métricas de proxy solo loopback.");
const profiles = [
  {
    name: "fast",
    latencyMs: 0,
    downBytesPerSecond: -1,
    upBytesPerSecond: -1,
    cpuRate: 1,
  },
  {
    name: "mobile",
    latencyMs: 150,
    downBytesPerSecond: 200_000,
    upBytesPerSecond: 93_750,
    cpuRate: 4,
  },
].filter((p) => profileNames.has(p.name));
const routes = [
  { name: "clients", path: "/clientes", ready: ".list-meta" },
  { name: "enrollment", path: "/clientes/nuevo", ready: 'input[name="name"]' },
  {
    name: "profile",
    path: `/clientes/${qa.E2E_CUSTOMER_ID}`,
    ready: ".profile-overview",
  },
  { name: "activities", path: "/actividades", ready: "h1" },
  { name: "summary", path: "/historial", ready: ".ledger-month-summary" },
  {
    name: "report",
    path: "/historial/resumen?version=actual",
    ready: ".operation-totals",
  },
  { name: "expenses", path: "/historial/gastos", ready: ".operation-totals" },
  {
    name: "messages",
    path: "/comunicaciones?seccion=campanas",
    ready: ".campaign-recipients",
  },
  { name: "alerts", path: "/avisos", ready: ".notification-filters" },
  ...(qa.E2E_CLOSED_MONTH
    ? [
        {
          name: "closed-report",
          path: `/historial/resumen?mes=${qa.E2E_CLOSED_MONTH}`,
          ready: ".operation-totals",
        },
      ]
    : []),
].filter((r) => !selectedRoutes || selectedRoutes.has(r.name));
const round = (n) => Math.round(n * 100) / 100;
function median(values) {
  const sorted = values
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .sort((a, b) => a - b);
  return sorted.length ? round(sorted[Math.floor(sorted.length / 2)]) : null;
}
function summary(rows) {
  const result = {};
  for (const key of new Set(rows.flatMap((r) => Object.keys(r)))) {
    if (rows.some((r) => typeof r[key] === "number"))
      result[key] = median(rows.map((r) => r[key]));
  }
  return result;
}
const report = {
  label,
  generatedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  build: readFileSync(".next/BUILD_ID", "utf8").trim(),
  node: process.version,
  machine: {
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
  },
  workingTreeChanges: execFileSync("git", ["diff", "--name-only"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean),
  samples,
  environment: "local-production-build/synthetic-db",
  serverState:
    "warm (one unrecorded HTML request per route); no Netlify cold-start claim",
  browserState:
    "fresh context + disabled HTTP cache for document samples; saved auth in memory",
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true },
  profiles,
  notes: [
    "CDP throttles browser-to-app requests, NOT app-to-Supabase requests. Backend delay must be provided independently by QA proxy and is recorded when available.",
    "saveData=true disables background app prefetch for controlled document and uncached-navigation runs. Prepared navigation is measured separately with prefetch enabled.",
    "LCP/CLS are laboratory observations after readiness + 350ms, not field Web Vitals. No field INP score is claimed.",
    "Interaction latency is action-to-visible-server-result; event durations and long tasks are additional lab measures.",
    "No business mutations/payment writes. Payment integrity/response-loss are covered separately by E2E/integration.",
    "Do not compare with October absolute values unless dataset, environment and 200ms backend delay are equivalent.",
  ],
  ssr: {},
  browser: {},
  journeys: {},
  errors: [],
};
const directory = "qa-artifacts/performance";
mkdirSync(directory, { recursive: true });
const output = `${directory}/${label}.json`;
const save = () =>
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
report.chromium = browser.version();
async function contextOptions(storageState, saveData = true) {
  const context = await browser.newContext({
    storageState,
    viewport: report.viewport,
    deviceScaleFactor: 2,
    hasTouch: true,
    locale: "es-AR",
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(45_000);
  context.setDefaultNavigationTimeout(90_000);
  await context.addInitScript(
    ({ saveData }) => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData, effectiveType: "4g" },
      });
      window.__shelbyBenchmark = {
        lcpMs: null,
        cls: 0,
        longTaskCount: 0,
        longTaskMs: 0,
        maxEventMs: 0,
      };
      for (const type of [
        "largest-contentful-paint",
        "layout-shift",
        "longtask",
        "event",
      ]) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
        new PerformanceObserver((list) => {
          const metrics = window.__shelbyBenchmark;
          for (const entry of list.getEntries()) {
            if (type === "largest-contentful-paint")
              metrics.lcpMs = entry.startTime;
            if (type === "layout-shift" && !entry.hadRecentInput)
              metrics.cls += entry.value;
            if (type === "longtask") {
              metrics.longTaskCount++;
              metrics.longTaskMs += entry.duration;
            }
            if (type === "event")
              metrics.maxEventMs = Math.max(metrics.maxEventMs, entry.duration);
          }
        }).observe({
          type,
          buffered: true,
          ...(type === "event" ? { durationThreshold: 16 } : {}),
        });
      }
    },
    { saveData },
  );
  return context;
}
async function throttle(page, profile) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.downBytesPerSecond,
    uploadThroughput: profile.upBytesPerSecond,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
  return cdp;
}
async function metricsSnapshot() {
  if (!proxyMetrics) return null;
  const response = await fetch(proxyMetrics, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw Error("No se pudieron leer métricas proxy");
  return response.json();
}
async function documentMetrics(page, elapsed) {
  return page.evaluate((readyMs) => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const js = resources.filter((r) => /\.js(?:\?|$)/.test(r.name));
    return {
      readyMs,
      ttfbMs: navigation.responseStart - navigation.requestStart,
      documentMs: navigation.responseEnd - navigation.requestStart,
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      ...window.__shelbyBenchmark,
      transferBytes:
        navigation.transferSize +
        resources.reduce((n, r) => n + r.transferSize, 0),
      jsTransferBytes: js.reduce((n, r) => n + r.transferSize, 0),
      jsDecodedBytes: js.reduce((n, r) => n + r.decodedBodySize, 0),
      resourceRequests: resources.length + 1,
      jsRequests: js.length,
      ocrLoaded: resources.some((r) => /\/ocr\/|tesseract/i.test(r.name)),
    };
  }, round(elapsed));
}
try {
  const auth = await contextOptions(undefined);
  const authPage = await auth.newPage();
  await authPage.goto(`${base}/login`);
  await authPage.getByLabel("Correo electrónico").fill(qa.E2E_OWNER_EMAIL);
  await authPage
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.E2E_OWNER_PASSWORD);
  await authPage.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await authPage.waitForURL("**/clientes");
  const storageState = await auth.storageState();
  await auth.close(); // no live pages/Realtime/prefetch during isolated SSR measurements
  const cookie = storageState.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (sections.has("ssr")) {
    for (const route of routes) {
      const request = async () => {
        const before = await metricsSnapshot();
        const start = performance.now();
        const response = await fetch(`${base}${route.path}`, {
          headers: { cookie },
          redirect: "manual",
          signal: AbortSignal.timeout(60000),
        });
        const headerMs = performance.now() - start;
        const html = await response.text();
        if (response.status !== 200 || !html.includes("<h1"))
          throw Error(`${route.name}: SSR no devolvió pantalla privada`);
        return {
          ttfbMs: round(headerMs),
          totalMs: round(performance.now() - start),
          htmlBytes: Buffer.byteLength(html),
          backendBefore: before,
          backendAfter: await metricsSnapshot(),
        };
      };
      await request();
      const rows = [];
      for (let i = 0; i < samples; i++) rows.push(await request());
      report.ssr[route.name] = { samples: rows, median: summary(rows) };
      save();
      console.log(
        `SSR ${route.name}: ${report.ssr[route.name].median.totalMs} ms`,
      );
    }
  }
  if (sections.has("browser")) {
    for (const profile of profiles) {
      report.browser[profile.name] = {};
      for (const route of routes) {
        const rows = [];
        for (let i = 0; i < samples; i++) {
          const context = await contextOptions(storageState);
          const page = await context.newPage();
          await throttle(page, profile);
          const start = performance.now();
          await page.goto(`${base}${route.path}`, {
            waitUntil: "domcontentloaded",
          });
          await page.locator(route.ready).first().waitFor({ state: "visible" });
          const elapsed = performance.now() - start;
          await page.waitForTimeout(350); // identical bounded observation window, not networkidle
          rows.push(await documentMetrics(page, elapsed));
          await context.close();
        }
        report.browser[profile.name][route.name] = {
          samples: rows,
          median: summary(rows),
        };
        save();
        console.log(
          `Browser ${profile.name}/${route.name}: ${summary(rows).readyMs} ms`,
        );
      }
    }
  }
  if (sections.has("journeys")) {
    for (const profile of profiles) {
      const result = {};
      for (const journey of [
        "navigation-unprepared",
        "navigation-prepared",
        "open-profile",
        "search",
      ].filter(
        (name) => !args.journeys || args.journeys.split(",").includes(name),
      )) {
        const rows = [];
        for (let i = 0; i < samples; i++) {
          const prepared = journey === "navigation-prepared";
          const context = await contextOptions(storageState, !prepared);
          const page = await context.newPage();
          await throttle(page, profile);
          const prefetch = prepared
            ? page
                .waitForResponse(
                  (r) =>
                    new URL(r.url()).pathname === "/actividades" &&
                    r.request().headers().rsc === "1" &&
                    r.ok(),
                  { timeout: 20000 },
                )
                .then(async (r) => {
                  await Promise.race([
                    r.finished(),
                    new Promise((_, reject) =>
                      setTimeout(
                        () =>
                          reject(
                            new Error(
                              "Precarga sin cierre de respuesta en 15 s",
                            ),
                          ),
                        15000,
                      ),
                    ),
                  ]);
                  return true;
                })
                .catch(() => false)
            : Promise.resolve(false);
          await page.goto(`${base}/clientes`);
          await page.locator(".list-meta").waitFor();
          const prefetchObserved = await prefetch;
          if (prepared && !prefetchObserved)
            throw Error(
              "No se observó precarga completa de Actividades; no llamar caliente a esta muestra.",
            );
          if (journey === "search")
            await page
              .getByRole("textbox", { name: "Buscar por nombre", exact: true })
              .fill("QA");
          const start = performance.now();
          if (journey.startsWith("navigation")) {
            await page
              .getByRole("navigation", { name: "Navegación principal" })
              .getByRole("link", { name: "Actividades", exact: true })
              .click();
            await page
              .getByRole("heading", { name: "Actividades", exact: true })
              .waitFor();
          } else if (journey === "open-profile") {
            await page.locator(".customer-row").first().click();
            await page.locator(".profile-overview").waitFor();
          } else {
            await page
              .getByRole("button", { name: "Buscar", exact: true })
              .click();
            await page.waitForURL((url) => url.searchParams.get("q") === "QA");
            await page.locator(".list-meta").waitFor();
          }
          const elapsed = performance.now() - start;
          rows.push({
            resultMs: round(elapsed),
            prefetchObserved,
            maxEventMs: await page.evaluate(
              () => window.__shelbyBenchmark.maxEventMs,
            ),
          });
          await context.close();
        }
        result[journey] = { samples: rows, median: summary(rows) };
        report.journeys[profile.name] = result;
        save();
        console.log(
          `Journey ${profile.name}/${journey}: ${summary(rows).resultMs} ms`,
        );
      }
    }
  }
} catch (error) {
  report.errors.push(
    error instanceof Error ? error.message : "Error de benchmark",
  );
  process.exitCode = 1;
} finally {
  save();
  await browser.close();
}
console.log(
  `Reporte: ${output}${report.errors.length ? " (INCOMPLETO; revisar errors)" : ""}`,
);
