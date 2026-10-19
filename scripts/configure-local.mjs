import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local"))
  throw new Error(
    ".env.local ya existe. No se sobrescribió; revisalo manualmente.",
  );
const result = execFileSync(
  "pnpm",
  ["exec", "supabase", "status", "-o", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const status = JSON.parse(result.slice(result.indexOf("{")));
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL))
  throw new Error("Este script solo configura el stack local.");
writeFileSync(
  ".env.local",
  [
    "# Solo desarrollo local. Nunca versionar ni subir a Drive.",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY || status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    "",
  ].join("\n"),
  { mode: 0o600, flag: "wx" },
);
console.log(
  ".env.local creado con las claves del stack local. Ninguna clave se imprimió.",
);
