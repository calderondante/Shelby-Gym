import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL || "",
  )
)
  throw Error("Solo se permiten datos sintéticos locales.");
const client = () =>
    createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
  owner = client(),
  monitor = client(),
  anon = client();
for (const [db, role] of [
  [owner, "OWNER"],
  [monitor, "MONITOR"],
])
  assert.equal(
    (
      await db.auth.signInWithPassword({
        email: qa[`E2E_${role}_EMAIL`],
        password: qa[`E2E_${role}_PASSWORD`],
      })
    ).error,
    null,
  );
const ok = async (p, label) => {
  const r = await p;
  assert.equal(r.error, null, `${label}: ${r.error?.message}`);
  return r.data;
};
const no = async (p, code) => {
  const r = await p;
  assert.ok(r.error || r.data?.length === 0, `Debe denegar ${code}`);
  if (r.error && code) assert.equal(r.error.message, code);
};
const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  month = day.slice(0, 7),
  run = randomUUID().slice(0, 8);
const activityData = {
  name: `Pack 3 QA ${run}`,
  description: "Tres clases sin vencimiento",
  price_cents: 3000000,
  offer_price_cents: null,
  offer_label: "",
  duration_count: 3,
  duration_unit: "sessions",
  active: true,
};
const activity = await ok(
  owner.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: activityData,
  }),
  "Crear pack",
);
const enroll = {
  p_request: randomUUID(),
  p_customer_id: null,
  p_customer: {
    name: `Clases QA ${run}`,
    phone: "+54 9 11 0000 0000",
    instagram: "@clases.qa",
    birthMonth: Number(month.slice(5)),
    marketingOptIn: true,
  },
  p_activity: activity,
  p_expected_price: 3000000,
  p_expected_revision: 1,
  p_expected_start: day,
  p_entries: [{ method: "cash", amount: 1000000 }],
};
const customer = await ok(
  monitor.rpc("enroll_customer", enroll),
  "Contratar pack parcial",
);
let pack = (
  await ok(
    owner.from("subscription_balances").select("*").eq("customer_id", customer),
    "Leer pack",
  )
)[0];
assert.equal(pack.ends_on, null);
assert.equal(pack.sessions_remaining, 3);
assert.equal(pack.balance_cents, 2000000);
const profile = (
  await ok(owner.from("customers").select("*").eq("id", customer), "Instagram")
)[0];
assert.equal(profile.instagram, "@clases.qa");
assert.equal(profile.marketing_opt_in, true);
const session = {
  p_subscription: pack.id,
  p_request: randomUUID(),
  p_acknowledge_debt: false,
};
await no(monitor.rpc("record_session", session), "DEBT_CONFIRMATION_REQUIRED");
session.p_acknowledge_debt = true;
const event = await ok(
  monitor.rpc("record_session", session),
  "Clase con deuda",
);
assert.equal(
  await ok(monitor.rpc("record_session", session), "Reintento de asistencia"),
  event,
);
const parallel = await Promise.all(
  Array.from({ length: 3 }, () =>
    monitor.rpc("record_session", { ...session, p_request: randomUUID() }),
  ),
);
assert.equal(parallel.filter((r) => !r.error).length, 2);
assert.equal(
  parallel.filter((r) => r.error?.message === "NO_SESSIONS").length,
  1,
);
pack = (
  await ok(
    owner.from("subscription_balances").select("*").eq("id", pack.id),
    "Saldo pack",
  )
)[0];
assert.equal(pack.sessions_remaining, 0);
await no(
  monitor.rpc("record_session", {
    ...session,
    p_request: randomUUID(),
    p_reverse: event,
    p_reason: "Error de recepción",
  }),
  "FORBIDDEN",
);
const reverse = {
  ...session,
  p_request: randomUUID(),
  p_reverse: event,
  p_reason: "Error de recepción",
};
await ok(owner.rpc("record_session", reverse), "Devolver clase");
assert.equal(
  (
    await ok(
      owner
        .from("subscription_balances")
        .select("sessions_remaining")
        .eq("id", pack.id),
      "Clase devuelta",
    )
  )[0].sessions_remaining,
  1,
);
await ok(
  owner.rpc("record_payment", {
    p_subscription: pack.id,
    p_request: randomUUID(),
    p_entries: [{ method: "transfer", amount: 2000000 }],
  }),
  "Completar deuda sin crear pack",
);
await ok(
  owner.rpc("save_activity", {
    p_id: activity,
    p_revision: 1,
    p_data: { ...activityData, price_cents: 4500000 },
  }),
  "Subir precio",
);
assert.equal(
  (
    await ok(
      owner
        .from("subscription_balances")
        .select("total_cents,sessions_remaining")
        .eq("id", pack.id),
      "Precio histórico",
    )
  )[0].total_cents,
  3000000,
);
for (const table of [
  "session_events",
  "expenses",
  "expense_templates",
  "expense_payments",
  "monthly_closings",
  "campaigns",
  "campaign_recipients",
  "raffle_entries",
])
  await no(anon.from(table).select("*"));
const template = await ok(
  owner.rpc("save_expense_template", {
    p_id: null,
    p_revision: 0,
    p_data: {
      title: `Luz QA ${run}`,
      category: "Servicios",
      amount: 2000000,
      dueDay: 31,
      active: true,
    },
  }),
  "Plantilla",
);
await no(
  monitor.rpc("generate_monthly_expenses", { p_month: `${month}-01` }),
  "FORBIDDEN",
);
await ok(
  owner.rpc("generate_monthly_expenses", { p_month: `${month}-01` }),
  "Generar",
);
assert.equal(
  await ok(
    owner.rpc("generate_monthly_expenses", { p_month: `${month}-01` }),
    "No duplicar",
  ),
  0,
);
let expense = (
  await ok(
    owner.from("expense_balances").select("*").eq("template_id", template),
    "Gasto generado",
  )
)[0];
await ok(
  owner.rpc("save_expense_template", {
    p_id: template,
    p_revision: 1,
    p_data: {
      title: `Luz QA ${run}`,
      category: "Servicios",
      amount: 3000000,
      dueDay: 31,
      active: true,
    },
  }),
  "Actualizar plantilla",
);
assert.equal(
  (
    await ok(
      owner.from("expense_balances").select("total_cents").eq("id", expense.id),
      "Histórico gastos",
    )
  )[0].total_cents,
  2000000,
);
const pay = {
  p_expense: expense.id,
  p_request: randomUUID(),
  p_entries: [
    { method: "cash", amount: 400000 },
    { method: "transfer", amount: 400000 },
  ],
};
const payment = await ok(owner.rpc("pay_expense", pay), "Pago de gasto mixto");
assert.equal(
  await ok(owner.rpc("pay_expense", pay), "Reintento de gasto"),
  payment,
);
expense = (
  await ok(
    owner.from("expense_balances").select("*").eq("id", expense.id),
    "Saldo gasto",
  )
)[0];
assert.equal(expense.balance_cents, 1200000);
await no(
  owner.rpc("pay_expense", {
    ...pay,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 1200001 }],
  }),
  "OVERPAYMENT",
);
await no(
  monitor.rpc("pay_expense", { ...pay, p_request: randomUUID() }),
  "FORBIDDEN",
);
await ok(
  owner.rpc("pay_expense", {
    p_expense: expense.id,
    p_request: randomUUID(),
    p_entries: [],
    p_reverse: payment,
    p_reason: "Importe registrado por error",
  }),
  "Revertir gasto",
);
assert.equal(
  (
    await ok(
      owner
        .from("expense_balances")
        .select("balance_cents")
        .eq("id", expense.id),
      "Gasto recuperado",
    )
  )[0].balance_cents,
  2000000,
);
await no(
  owner.rpc("close_gym_month", { p_month: `${month}-01` }),
  "INVALID_MONTH",
);
// Pick an old synthetic month and add a historical client to prove closing debt and later settlement.
const closedMonths = new Set(
  (
    await ok(owner.from("monthly_closings").select("month"), "Meses cerrados")
  ).map((c) => c.month.slice(0, 7)),
);
let past = "2025-01";
while (closedMonths.has(past)) {
  const d = new Date(`${past}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  past = d.toISOString().slice(0, 7);
}
const nextPastDate = new Date(`${past}-11T12:00:00Z`);
nextPastDate.setUTCMonth(nextPastDate.getUTCMonth() + 1);
const nextPast = nextPastDate.toISOString().slice(0, 10);
const importArgs = {
  p_request: randomUUID(),
  p_source: `operations-${run}`,
  p_currency: "ARS",
  p_commit: true,
  p_clients: [
    {
      row: 2,
      external_id: "return",
      name: `Regreso QA ${run}`,
      phone: "",
      email: "",
      age_years: null,
      age_as_of: null,
      periods: [
        {
          row: 2,
          external_id: "period",
          activity_id: qa.E2E_ACTIVITY_ID,
          starts_on: `${past}-11`,
          ends_on: nextPast,
          total_cents: 2000000,
          balance_cents: 1000000,
          payments: [
            {
              external_id: "first",
              date: `${past}-11`,
              entries: [{ method: "cash", amount: 1000000 }],
            },
          ],
        },
      ],
    },
  ],
};
await ok(
  owner.rpc("import_gym_history", importArgs),
  "Importar historia previa al cierre",
);
const historicalCustomer = (
  await ok(
    owner
      .from("customers")
      .select("id,revision")
      .eq("name", `Regreso QA ${run}`),
    "Cliente antiguo",
  )
)[0];
await ok(
  owner.rpc("update_customer", {
    p_id: historicalCustomer.id,
    p_revision: historicalCustomer.revision,
    p_data: {
      name: `Regreso QA ${run}`,
      phone: "+54 9 11 0000 0000",
      instagram: "@regreso.qa",
      marketingOptIn: true,
      birthMonth: Number(month.slice(5)),
      email: "",
      notes: "",
    },
  }),
  "Preparar contacto",
);
await ok(
  owner.rpc("close_gym_month", { p_month: `${past}-01` }),
  "Cerrar pasado",
);
const closing = (
  await ok(
    owner.from("monthly_closings").select("*").eq("month", `${past}-01`),
    "Cierre",
  )
)[0];
assert.ok(closing.snapshot.pendingTotal >= 1000000);
const oldPack = (
  await ok(
    owner
      .from("subscription_balances")
      .select("*")
      .eq("customer_id", historicalCustomer.id),
    "Cuota anterior",
  )
)[0];
await ok(
  owner.rpc("record_payment", {
    p_subscription: oldPack.id,
    p_request: randomUUID(),
    p_entries: [{ method: "transfer", amount: 1000000 }],
  }),
  "Cobrar después del cierre",
);
assert.deepEqual(
  (
    await ok(
      owner
        .from("monthly_closings")
        .select("snapshot")
        .eq("month", `${past}-01`),
      "Cierre conservado",
    )
  )[0].snapshot,
  closing.snapshot,
);
const campaignArgs = {
  p_request: randomUUID(),
  p_title: `Regreso ${run}`,
  p_message: "Te esperamos en Shelby Gym para volver a entrenar.",
  p_activity: qa.E2E_ACTIVITY_ID,
  p_customers: [historicalCustomer.id],
};
const campaign = await ok(
  owner.rpc("save_recovery_campaign", campaignArgs),
  "Preparar recuperación",
);
assert.equal(
  await ok(
    owner.rpc("save_recovery_campaign", campaignArgs),
    "Reintento campaña",
  ),
  campaign,
);
await no(
  monitor.rpc("save_recovery_campaign", {
    ...campaignArgs,
    p_request: randomUUID(),
  }),
  "FORBIDDEN",
);
await no(
  owner.rpc("save_recovery_campaign", {
    ...campaignArgs,
    p_request: randomUUID(),
    p_customers: [customer],
  }),
  "RECIPIENTS_CHANGED",
);
// A concurrent close either includes the import or rejects it; it must never omit a committed collection.
const closedNow = new Set(
  (
    await ok(owner.from("monthly_closings").select("month"), "Cierres actuales")
  ).map((c) => c.month.slice(0, 7)),
);
let raceMonth = "2024-01";
while (closedNow.has(raceMonth)) {
  const date = new Date(`${raceMonth}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  raceMonth = date.toISOString().slice(0, 7);
}
const raceDate = new Date(`${raceMonth}-11T12:00:00Z`);
raceDate.setUTCMonth(raceDate.getUTCMonth() + 1);
const raceImport = structuredClone(importArgs);
raceImport.p_request = randomUUID();
raceImport.p_source = `race-${run}`;
raceImport.p_clients[0].name = `Cierre concurrente ${run}`;
Object.assign(raceImport.p_clients[0].periods[0], {
  starts_on: `${raceMonth}-11`,
  ends_on: raceDate.toISOString().slice(0, 10),
});
raceImport.p_clients[0].periods[0].payments[0].date = `${raceMonth}-11`;
const [raceClose, raceWrite] = await Promise.all([
  owner.rpc("close_gym_month", { p_month: `${raceMonth}-01` }),
  owner.rpc("import_gym_history", raceImport),
]);
assert.equal(raceClose.error, null);
if (raceWrite.error) assert.equal(raceWrite.error.message, "MONTH_CLOSED");
else {
  const saved = (
    await ok(
      owner
        .from("monthly_closings")
        .select("snapshot")
        .eq("month", `${raceMonth}-01`),
      "Cierre de operación concurrente",
    )
  )[0];
  assert.ok(
    saved.snapshot.received >= 1000000,
    "El cierre incluye el cobro que se confirmó antes",
  );
}

// Fresh draw: session-only profiles must be excluded and participants must be frozen.
const drawYear = Number(day.slice(0, 4)),
  drawMonth = Number(month.slice(5));
const existingDraw = await ok(
  owner
    .from("raffle_draws")
    .select("*")
    .eq("birth_year", drawYear)
    .eq("birth_month", drawMonth),
  "Ver sorteo",
);
if (!existingDraw.length) {
  await ok(
    owner.rpc("record_raffle_draw", {
      p_year: drawYear,
      p_month: drawMonth,
      p_draw_on: day,
    }),
    "Cerrar sorteo",
  );
  const entry = (
    await ok(
      owner.from("raffle_entries").select("*").eq("customer_id", customer),
      "Exclusión pack",
    )
  )[0];
  assert.equal(entry.exclusion_reason, "Sin cuota de socio");
  const entries = await ok(
    owner
      .from("raffle_entries")
      .select("*")
      .eq("birth_year", drawYear)
      .eq("birth_month", drawMonth)
      .order("customer_id"),
    "Lista guardada",
  );
  await ok(
    owner.rpc("update_customer", {
      p_id: customer,
      p_revision: profile.revision,
      p_data: {
        name: "Nombre cambiado QA",
        phone: "",
        instagram: "",
        marketingOptIn: false,
        birthMonth: 1,
        email: "",
        notes: "",
      },
    }),
    "Editar tras cierre",
  );
  assert.deepEqual(
    await ok(
      owner
        .from("raffle_entries")
        .select("*")
        .eq("birth_year", drawYear)
        .eq("birth_month", drawMonth)
        .order("customer_id"),
      "Lista intacta",
    ),
    entries,
  );
}
console.log(
  "OK: packs sin vencimiento, Instagram, deuda, concurrencia de clases, correcciones, precios históricos, gastos mixtos, recurrencia idempotente, RLS, cierre conservado, campañas y sorteo solo socios.",
);
