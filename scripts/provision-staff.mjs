/** Server-only administration. Reads secrets from .env.local; never prints them. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = { ...parseEnv(readFileSync(".env.local", "utf8")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "Configurá URL y SUPABASE_SERVICE_ROLE_KEY en .env.local para administrar cuentas. La app no usa esta clave.",
  );
const [email, name, role = "monitor"] = process.argv.slice(2);
if (!email || !name || !["owner", "monitor"].includes(role))
  throw new Error(
    'Uso: node scripts/provision-staff.mjs correo "Nombre" owner|monitor',
  );
// Read from an interactive terminal with echo disabled. No shell arguments/history.
if (!process.stdin.isTTY)
  throw new Error("Ejecutá la provisión desde una terminal interactiva.");
process.stdout.write("Contraseña inicial (12+ caracteres, entrada oculta): ");
const password = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  const finish = () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeListener("data", onData);
    process.stdout.write("\n");
  };
  const onData = (chunk) => {
    for (const char of chunk) {
      if (char === "\u0003") {
        finish();
        reject(new Error("Provisión cancelada."));
        return;
      }
      if (char === "\r" || char === "\n") {
        finish();
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
      else if (char >= " ") value += char;
    }
  };
  process.stdin.on("data", onData);
});
if (password.length < 12)
  throw new Error("La contraseña debe tener al menos 12 caracteres.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error)
  throw new Error(
    `No se creó la cuenta (${error.code ?? error.status}). Revisá el correo y la configuración.`,
  );
const staff = await db.from("staff").insert({ id: data.user.id, name, role });
if (staff.error) {
  // A new Auth account without a staff row has no access. Keep the failure actionable.
  throw new Error(
    `La cuenta Auth se creó, pero falta habilitar staff. ID: ${data.user.id}. Revisá migraciones y permisos antes de reintentar; no tiene acceso a datos.`,
  );
}
console.log(
  `Cuenta de ${role} creada. No se enviaron correos ni se guardó la contraseña en archivos.`,
);
