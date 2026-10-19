/** Add an idempotent, fictional showcase to a local Supabase project. */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const env = parseEnv(readFileSync(".env.local", "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url ?? ""))
  throw new Error("La muestra solo puede escribirse en Supabase local :54321.");

let email = process.argv[2];
let password;
if (email === "--qa") {
  const qa = parseEnv(readFileSync(".env.test.local", "utf8"));
  email = qa.E2E_OWNER_EMAIL;
  password = qa.E2E_OWNER_PASSWORD;
} else {
  if (!email || !process.stdin.isTTY)
    throw new Error(
      'Uso: node scripts/seed-demo.mjs correo-del-dueño (terminal interactiva)',
    );
  process.stdout.write("Contraseña del dueño (entrada oculta): ");
  password = await new Promise((resolve, reject) => {
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
          reject(new Error("Operación cancelada."));
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
}
if (!email || !password) throw new Error("Faltan las credenciales del dueño.");
const db = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await db.auth.signInWithPassword({ email, password });
if (signed.error) throw new Error("No se pudo iniciar sesión como dueño.");
const staff = await db.from("staff").select("role").eq("id", signed.data.user.id).single();
if (staff.error || staff.data.role !== "owner")
  throw new Error("Solo la cuenta del dueño puede preparar la muestra.");
const ok = async (request, label) => {
  const { data, error } = await request;
  if (error) throw new Error(`${label}: ${error.code ?? "falló"}`);
  return data;
};
const settings = await ok(
  db.from("gym_settings").select("currency,time_zone").eq("id", true).maybeSingle(),
  "Leer ajustes",
);
if (!settings) {
  await ok(
    db.rpc("configure_gym", {
      p_currency: "ARS",
      p_time_zone: "America/Argentina/Buenos_Aires",
    }),
    "Configurar moneda y horario",
  );
} else if (
  settings.currency !== "ARS" ||
  settings.time_zone !== "America/Argentina/Buenos_Aires"
) {
  throw new Error("Los ajustes existentes no son ARS y horario de Argentina.");
}

const activities = [
  { name: "Musculación · muestra", description: "Sala de musculación", price_cents: 3000000 },
  { name: "Artes marciales · muestra", description: "Clases y entrenamiento técnico", price_cents: 2800000 },
  { name: "Integral Shelby · muestra", description: "Musculación + artes marciales", price_cents: 4500000 },
];
const activityIds = new Map();
for (const activity of activities) {
  const current = await ok(
    db.from("activities").select("id,price_cents,active,revision").eq("name", activity.name).limit(1),
    "Buscar actividad",
  );
  if (current.length) {
    if (!current[0].active || current[0].price_cents !== activity.price_cents)
      throw new Error(`La actividad ${activity.name} ya existe con otras condiciones.`);
    activityIds.set(activity.name, {
      id: current[0].id,
      revision: current[0].revision,
    });
    continue;
  }
  const id = await ok(
    db.rpc("save_activity", {
      p_id: null,
      p_revision: 0,
      p_data: {
        ...activity,
        offer_price_cents: null,
        offer_label: "",
        duration_count: 1,
        duration_unit: "months",
        active: true,
      },
    }),
    "Crear actividad de muestra",
  );
  activityIds.set(activity.name, { id, revision: 1 });
}
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts();
const today = ["year", "month", "day"]
  .map((type) => parts.find((part) => part.type === type).value)
  .join("-");
const customers = [
  {
    name: "Sofía Benítez · muestra",
    activity: activities[2],
    entries: [
      { method: "transfer", amount: 1500000 },
      { method: "cash", amount: 1000000 },
    ],
  },
  {
    name: "Tomás Romero · muestra",
    activity: activities[0],
    entries: [{ method: "mercado_pago", amount: 3000000 }],
  },
  {
    name: "Martina Suárez · muestra",
    activity: activities[1],
    entries: [{ method: "transfer", amount: 1000000 }],
  },
];
let created = 0;
for (const customer of customers) {
  const current = await ok(
    db.from("customers").select("id").eq("name", customer.name).limit(1),
    "Buscar cliente",
  );
  if (current.length) continue;
  await ok(
    db.rpc("enroll_customer", {
      p_request: randomUUID(),
      p_customer_id: null,
      p_customer: {
        name: customer.name,
        phone: "",
        email: "",
        notes: "Persona y pagos ficticios para demostración local.",
      },
      p_activity: activityIds.get(customer.activity.name).id,
      p_expected_price: customer.activity.price_cents,
      p_expected_revision: activityIds.get(customer.activity.name).revision,
      p_expected_start: today,
      p_entries: customer.entries,
    }),
    "Crear cliente de muestra",
  );
  created++;
}
console.log(
  `Muestra lista: ${activities.length} actividades, ${customers.length} clientes ficticios (${created} nuevos).`,
);
console.log("Sofía: abono combinado y saldo pendiente. Tomás: al día. Martina: pago parcial.");
