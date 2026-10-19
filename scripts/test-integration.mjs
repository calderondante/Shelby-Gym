import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const env = parseEnv(readFileSync(".env.local", "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url ?? ""))
  throw new Error(
    "Las pruebas con escritura solo se ejecutan contra Supabase local :54321.",
  );
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, options);
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const anonymous = createClient(url, publicKey, options);
const run = randomUUID().slice(0, 8);
const accounts = {};
for (const role of ["owner", "monitor", "outsider"]) {
  const email = `qa-${role}-${run}@example.test`;
  const password = `Sg!${randomBytes(24).toString("base64url")}`;
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(result.error, null, "Auth debe crear una cuenta de prueba");
  if (role !== "outsider") {
    const row = await admin.from("staff").insert({
      id: result.data.user.id,
      name: role === "owner" ? "Dueño de prueba" : "Monitor de prueba",
      role,
    });
    assert.equal(row.error, null, "Debe habilitar staff");
  }
  const client = createClient(url, publicKey, options);
  const signIn = await client.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null, "El login real debe funcionar");
  accounts[role] = { email, password, id: result.data.user.id, client };
}
const owner = accounts.owner.client,
  monitor = accounts.monitor.client,
  outsider = accounts.outsider.client;
const ok = async (request, message) => {
  const result = await request;
  assert.equal(result.error, null, message);
  return result.data;
};
const denied = async (request, message) => {
  const result = await request;
  assert.ok(result.error || result.data?.length === 0, message);
};
await ok(
  owner.rpc("configure_gym", {
    p_currency: "ARS",
    p_time_zone: "America/Argentina/Buenos_Aires",
  }),
  "Configurar gimnasio",
);
await denied(anonymous.from("customers").select("*"), "Anónimo no ve clientes");
await denied(
  outsider.from("customers").select("*"),
  "Autenticado sin staff no ve clientes",
);
await denied(
  outsider.rpc("configure_gym", { p_currency: "ARS", p_time_zone: "UTC" }),
  "Una cuenta cualquiera no configura el gimnasio",
);
await denied(
  monitor.from("staff").update({ role: "owner" }).eq("id", accounts.monitor.id),
  "Monitor no eleva su rol",
);
const activityData = {
  name: "Musculación",
  description: "Sala de musculación · datos sintéticos de QA",
  price_cents: 3000000,
  offer_price_cents: null,
  offer_label: "",
  duration_count: 1,
  duration_unit: "months",
  active: true,
};
await denied(
  monitor.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: activityData,
  }),
  "Monitor no modifica precios",
);
const activityId = await ok(
  owner.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: activityData,
  }),
  "Dueño crea actividad",
);
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts();
const today = ["year", "month", "day"]
  .map((t) => parts.find((p) => p.type === t).value)
  .join("-");
const enrollment = {
  p_request: randomUUID(),
  p_customer_id: null,
  p_customer: {
    name: "Ana Torres",
    phone: "",
    email: "",
    notes: "Registro sintético para pruebas",
  },
  p_activity: activityId,
  p_expected_price: 3000000,
  p_expected_revision: 1,
  p_expected_start: today,
  p_entries: [
    { method: "transfer", amount: 750000 },
    { method: "cash", amount: 750000 },
  ],
};
const customerId = await ok(
  monitor.rpc("enroll_customer", enrollment),
  "Alta y primer pago mixto atómicos",
);
assert.equal(
  await ok(
    monitor.rpc("enroll_customer", enrollment),
    "Reintentar alta es idempotente",
  ),
  customerId,
);
let subs = await ok(
  monitor
    .from("subscription_balances")
    .select("*")
    .eq("customer_id", customerId),
  "Leer cuota",
);
assert.equal(subs.length, 1);
assert.equal(subs[0].paid_cents, 1500000);
assert.equal(subs[0].balance_cents, 1500000);
assert.equal(subs[0].starts_on, today);
const initialEnd = subs[0].ends_on;
const subscriptionId = subs[0].id;
await denied(
  outsider.rpc("record_payment", {
    p_subscription: subscriptionId,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 100 }],
  }),
  "RPC no permite acceso sin staff",
);
await denied(
  monitor
    .from("payment_entries")
    .insert({ batch_id: randomUUID(), method: "cash", amount_cents: 1 }),
  "No se salta el ledger por REST",
);
await denied(
  monitor
    .from("subscriptions")
    .update({ ends_on: "2099-01-01" })
    .eq("id", subscriptionId),
  "No se alteran fechas directamente",
);
const payment = {
  p_subscription: subscriptionId,
  p_request: randomUUID(),
  p_entries: [{ method: "mercado_pago", amount: 500000 }],
};
const paymentId = await ok(
  monitor.rpc("record_payment", payment),
  "Abono posterior",
);
assert.equal(
  await ok(
    monitor.rpc("record_payment", payment),
    "Reintento de abono no duplica",
  ),
  paymentId,
);
await denied(
  monitor.rpc("record_payment", {
    ...payment,
    p_entries: [{ method: "cash", amount: 100 }],
  }),
  "Reusar idempotencia con datos distintos falla",
);
await denied(
  monitor.rpc("record_payment", {
    ...payment,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: -100 }],
  }),
  "No acepta pagos negativos",
);
await denied(
  monitor.rpc("record_payment", {
    ...payment,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 1000001 }],
  }),
  "No acepta exceder saldo",
);
const concurrent = await Promise.all(
  [monitor, owner].map((c) =>
    c.rpc("record_payment", {
      p_subscription: subscriptionId,
      p_request: randomUUID(),
      p_entries: [{ method: "cash", amount: 750000 }],
    }),
  ),
);
assert.equal(
  concurrent.filter((r) => !r.error).length,
  1,
  "Solo uno de dos pagos concurrentes incompatibles debe confirmarse",
);
subs = await ok(
  owner.from("subscription_balances").select("*").eq("id", subscriptionId),
  "Revisar integridad tras concurrencia",
);
assert.equal(subs[0].paid_cents, 2750000);
assert.equal(subs[0].balance_cents, 250000);
assert.equal(subs[0].ends_on, initialEnd, "Pagar saldo no renueva");
await denied(
  monitor.rpc("enroll_customer", {
    ...enrollment,
    p_request: randomUUID(),
    p_customer_id: customerId,
  }),
  "No duplica un período activo",
);
await denied(
  monitor.rpc("enroll_customer", {
    ...enrollment,
    p_request: randomUUID(),
    p_expected_start: "2026-01-01",
  }),
  "Fecha vista desactualizada no se acepta silenciosamente",
);
const customersBefore = await ok(
  owner.from("customers").select("id"),
  "Contar clientes",
);
await denied(
  monitor.rpc("enroll_customer", {
    ...enrollment,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 9000000 }],
  }),
  "Alta inválida revierte también el perfil",
);
const customersAfter = await ok(
  owner.from("customers").select("id"),
  "Contar luego de fallo",
);
assert.equal(customersAfter.length, customersBefore.length);
await ok(
  owner.rpc("save_activity", {
    p_id: activityId,
    p_revision: 1,
    p_data: { ...activityData, price_cents: 3500000 },
  }),
  "Actualizar tarifa",
);
await denied(
  owner.rpc("save_activity", {
    p_id: activityId,
    p_revision: 1,
    p_data: activityData,
  }),
  "Conflicto de edición no pisa cambios",
);
await denied(
  monitor.rpc("enroll_customer", { ...enrollment, p_request: randomUUID() }),
  "Precio/revisión desactualizados requieren revisión",
);
subs = await ok(
  owner.from("subscription_balances").select("*").eq("id", subscriptionId),
  "Consultar snapshot",
);
assert.equal(subs[0].total_cents, 3000000, "El precio histórico se conserva");
await denied(
  owner.rpc("configure_gym", { p_currency: "USD", p_time_zone: "UTC" }),
  "No se cambia moneda con cuotas existentes",
);
// Remaining fixtures exist ONLY in the local QA database. No app fallback consumes them.
const martialId = await ok(
  owner.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: {
      ...activityData,
      name: "Artes marciales",
      description: "Kickboxing y entrenamiento técnico · prueba",
      price_cents: 2800000,
    },
  }),
  "Actividad de prueba",
);
for (const [name, paid] of [
  ["Lucía Martínez", 3500000],
  ["Tomás Álvarez", 1200000],
  ["Mateo Fernández", 3500000],
  ["Valentina López", 1750000],
  ["Nicolás Romero", 3500000],
]) {
  await ok(
    owner.rpc("enroll_customer", {
      ...enrollment,
      p_request: randomUUID(),
      p_customer: {
        name,
        phone: "",
        email: "",
        notes: "Datos sintéticos · QA local",
      },
      p_expected_price: 3500000,
      p_expected_revision: 2,
      p_entries: [{ method: "transfer", amount: paid }],
    }),
    "Fixture local",
  );
}
await admin
  .from("staff")
  .update({ active: false })
  .eq("id", accounts.monitor.id);
await denied(
  monitor.from("customers").select("*"),
  "Revocar staff bloquea el token ya emitido",
);
await denied(
  monitor.rpc("record_payment", {
    p_subscription: subscriptionId,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 1 }],
  }),
  "Revocación bloquea mutaciones con sesión vigente",
);
await admin
  .from("staff")
  .update({ active: true })
  .eq("id", accounts.monitor.id);
writeFileSync(
  ".env.test.local",
  [
    `E2E_OWNER_EMAIL=${accounts.owner.email}`,
    `E2E_OWNER_PASSWORD=${accounts.owner.password}`,
    `E2E_MONITOR_EMAIL=${accounts.monitor.email}`,
    `E2E_MONITOR_PASSWORD=${accounts.monitor.password}`,
    `E2E_CUSTOMER_ID=${customerId}`,
    `E2E_ACTIVITY_ID=${activityId}`,
    `E2E_MARTIAL_ID=${martialId}`,
    `E2E_RUN=${run}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);
console.log(
  "OK: Auth real, RLS anónimo/sin staff/revocado, roles, transacciones, rollback, pagos mixtos, idempotencia, concurrencia, sobrepago, snapshots y conflictos de edición.",
);
console.log(
  "Datos sintéticos guardados en Supabase local. Accesos de QA en .env.test.local (ignorado); no se imprimieron credenciales.",
);
