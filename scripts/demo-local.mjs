/** Start the existing app for a short, trusted-LAN demonstration. */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";

const interfaces = Object.entries(networkInterfaces()).flatMap(([name, entries]) =>
  (entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => ({ name, address: entry.address })),
);
const candidates = interfaces.filter(
  ({ name, address }) =>
    !/^(docker|br-|veth|virbr|lo)/i.test(name) &&
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address),
);
const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (args.includes("--help")) {
  console.log("Uso: pnpm demo:local --host IP_PRIVADA_DE_TU_PC");
  console.log("El teléfono y la PC deben estar en la misma red Wi-Fi.");
  process.exit(0);
}
if (args.length !== 2 || args[0] !== "--host") {
  const found = candidates.map(({ name, address }) => `${name}: ${address}`);
  throw new Error(
    `Indicá --host con la IP local de esta PC. Detectadas: ${found.join(", ") || "ninguna"}.`,
  );
}
const host = args[1];
if (isIP(host) !== 4 || !candidates.some(({ address }) => address === host))
  throw new Error("--host debe ser una IP privada IPv4 activa de esta PC.");

let configured;
try {
  configured = parseEnv(readFileSync(".env.local", "utf8"));
} catch {
  throw new Error("Falta .env.local. Seguí docs/DEMO_LOCAL.md antes de iniciar.");
}
const api = configured.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(api ?? ""))
  throw new Error("La demo solo admite Supabase local en 127.0.0.1:54321.");
if (!configured.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  throw new Error("Falta la clave pública de Supabase local en .env.local.");

try {
  const response = await fetch(`http://${host}:54321/auth/v1/health`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch {
  throw new Error(
    `Supabase local no responde por ${host}:54321. Comprobá que esté iniciado y que el firewall permita la conexión.`,
  );
}

console.log(`App:      http://${host}:3000`);
console.log(`Supabase: http://${host}:54321`);
console.log("Abrí la primera dirección desde el celular conectado a la misma Wi-Fi.");
console.log("Usá solo datos ficticios. Ctrl+C detiene la app; Supabase se detiene aparte.");

const require = createRequire(import.meta.url);
const nextPackage = require("next/package.json");
const nextCli = resolve(
  dirname(require.resolve("next/package.json")),
  nextPackage.bin.next,
);
const child = spawn(process.execPath, [nextCli, "dev", "--hostname", "0.0.0.0"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://${host}:54321`,
    SHELBY_DEMO_HOST: host,
  },
});
child.once("error", (error) => {
  console.error(`No se pudo iniciar Next.js: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? 130 : (code ?? 1);
});
