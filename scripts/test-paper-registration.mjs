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
  throw Error("Solo pruebas locales con datos ficticios.");
const client = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const owner = client(),
  monitor = client(),
  anon = client();
const ok = async (p, label = "Operación") => {
  const r = await p;
  assert.equal(r.error, null, `${label}: ${r.error?.message}`);
  return r.data;
};
const no = async (p, message) => {
  const r = await p;
  assert.ok(r.error || r.data?.length === 0, "Debe denegarse");
  if (message) assert.equal(r.error?.message, message);
};
for (const [db, role] of [
  [owner, "OWNER"],
  [monitor, "MONITOR"],
])
  await ok(
    db.auth.signInWithPassword({
      email: qa[`E2E_${role}_EMAIL`],
      password: qa[`E2E_${role}_PASSWORD`],
    }),
  );
const settings = await ok(owner.from("gym_settings").select("*").single()),
  day = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.time_zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  run = randomUUID().slice(0, 8);
const closed = await ok(owner.from("monthly_closings").select("month"));
let start;
for (let offset = 1; offset < 60; offset++) {
  const date = new Date(Date.parse(`${day}T12:00:00Z`));
  date.setUTCMonth(date.getUTCMonth() - offset, 1);
  const candidate = date.toISOString().slice(0, 10);
  if (!closed.some((c) => c.month === candidate)) {
    start = candidate;
    break;
  }
}
assert.ok(start);
const end = start.slice(0, 8) + "20",
  paymentDay = start.slice(0, 8) + "02";
const activityData = {
  name: `Papel QA ${run}`,
  description: "Registro histórico",
  price_cents: 9000000,
  offer_price_cents: null,
  offer_label: "",
  duration_count: 1,
  duration_unit: "months",
  active: true,
};
const activity = await ok(
  owner.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: activityData,
  }),
);
const profile = {
  name: `Papel anterior ${run}`,
  phone: "",
  email: "",
  notes: "Desde cuaderno",
  birthMonth: 2,
  instagram: "@papel.qa",
  marketingOptIn: false,
  instagramMarketingOptIn: false,
};
const record = {
  activityId: activity,
  activityRevision: 1,
  currency: settings.currency,
  startsOn: start,
  endsOn: end,
  totalCents: 2500000,
  paidCents: 1800000,
  usedClasses: 0,
  payments: [],
};
const args = { p_request: randomUUID(), p_profile: profile, p_record: record };
await no(monitor.rpc("register_paper_customer", args), "FORBIDDEN");
await no(anon.rpc("register_paper_customer", args));
const id = await ok(
  owner.rpc("register_paper_customer", args),
  "Registrar vencido sin inventar recibos",
);
let sub = (
  await ok(
    owner.from("subscription_balances").select("*").eq("customer_id", id),
  )
)[0];
assert.equal(sub.total_cents, 2500000);
assert.equal(sub.balance_cents, 700000);
assert.equal(sub.opening_paid_cents, 1800000);
assert.equal(sub.ends_on, end);
assert.equal(
  (
    await ok(
      owner.from("payment_batches").select("id").eq("subscription_id", sub.id),
    )
  ).length,
  0,
);
assert.equal(await ok(owner.rpc("register_paper_customer", args)), id);
await no(
  owner.rpc("register_paper_customer", {
    ...args,
    p_profile: { ...profile, notes: "Cambió" },
  }),
  "REQUEST_CONFLICT",
);
let customer = await ok(
  owner.from("customers").select("*").eq("id", id).single(),
);
assert.equal(customer.instagram, "@papel.qa");
assert.equal(customer.birth_month, 2);
await ok(
  owner.rpc("update_customer", {
    p_id: id,
    p_revision: customer.revision,
    p_data: { ...profile, name: "Nombre corregido QA" },
  }),
);
await ok(owner.rpc("register_paper_customer", args));
assert.equal(
  (await ok(owner.from("customers").select("name").eq("id", id).single())).name,
  "Nombre corregido QA",
);
const paymentArgs = {
  p_subscription: sub.id,
  p_request: randomUUID(),
  p_entries: [{ method: "cash", amount: 700000 }],
};
await ok(monitor.rpc("record_payment", paymentArgs));
await ok(monitor.rpc("record_payment", paymentArgs));
sub = (
  await ok(
    owner.from("subscription_balances").select("*").eq("customer_id", id),
  )
)[0];
assert.equal(sub.balance_cents, 0);
assert.equal(sub.ends_on, end);
assert.equal(
  (
    await ok(
      owner.from("payment_batches").select("*").eq("subscription_id", sub.id),
    )
  ).length,
  1,
);
const mixed = await ok(
  owner.rpc("register_paper_customer", {
    p_request: randomUUID(),
    p_profile: { ...profile, name: `Mixto papel ${run}` },
    p_record: {
      ...record,
      payments: [
        {
          date: paymentDay,
          entries: [
            { method: "cash", amount: 500000 },
            { method: "transfer", amount: 700000 },
          ],
        },
      ],
    },
  }),
);
const mixedSub = (
  await ok(
    owner.from("subscription_balances").select("*").eq("customer_id", mixed),
  )
)[0];
assert.equal(mixedSub.opening_paid_cents, 600000);
assert.equal(mixedSub.balance_cents, 700000);
const batches = await ok(
  owner
    .from("payment_batches")
    .select("*,payment_entries(*)")
    .eq("subscription_id", mixedSub.id),
);
assert.equal(batches.length, 1);
assert.equal(batches[0].occurred_on, paymentDay);
assert.ok(batches[0].import_batch_id);
assert.equal(
  batches[0].payment_entries.reduce((n, p) => n + p.amount_cents, 0),
  1200000,
);
const zero = await ok(
  owner.rpc("register_paper_customer", {
    p_request: randomUUID(),
    p_profile: { ...profile, name: `Sin abono papel ${run}` },
    p_record: { ...record, paidCents: 0 },
  }),
);
assert.equal(
  (
    await ok(
      owner
        .from("subscription_balances")
        .select("balance_cents")
        .eq("customer_id", zero),
    )
  )[0].balance_cents,
  record.totalCents,
);
const pack = await ok(
  owner.rpc("save_activity", {
    p_id: null,
    p_revision: 0,
    p_data: {
      ...activityData,
      name: `Pack papel ${run}`,
      duration_unit: "sessions",
      duration_count: 3,
    },
  }),
);
const packId = await ok(
  owner.rpc("register_paper_customer", {
    p_request: randomUUID(),
    p_profile: { ...profile, name: `Clases papel ${run}` },
    p_record: { ...record, activityId: pack, endsOn: null, usedClasses: 2 },
  }),
);
const packSub = (
  await ok(
    owner.from("subscription_balances").select("*").eq("customer_id", packId),
  )
)[0];
assert.equal(packSub.sessions_remaining, 1);
assert.equal(packSub.opening_sessions_used, 2);
assert.equal(packSub.ends_on, null);
assert.equal(
  (
    await ok(
      owner
        .from("session_events")
        .select("id")
        .eq("subscription_id", packSub.id),
    )
  ).length,
  0,
);
const attended = await ok(
  monitor.rpc("record_session", {
    p_subscription: packSub.id,
    p_request: randomUUID(),
    p_acknowledge_debt: true,
  }),
);
assert.equal(
  (
    await ok(
      owner
        .from("subscription_balances")
        .select("sessions_remaining")
        .eq("id", packSub.id),
    )
  )[0].sessions_remaining,
  0,
);
await ok(
  owner.rpc("record_session", {
    p_subscription: packSub.id,
    p_request: randomUUID(),
    p_reverse: attended,
    p_reason: "Marcado por error",
    p_acknowledge_debt: false,
  }),
);
assert.equal(
  (
    await ok(
      owner
        .from("subscription_balances")
        .select("sessions_remaining")
        .eq("id", packSub.id),
    )
  )[0].sessions_remaining,
  1,
);
const future = new Date(Date.parse(`${day}T12:00:00Z`) + 86400000)
  .toISOString()
  .slice(0, 10);
for (const change of [
  { startsOn: future },
  { endsOn: start },
  { paidCents: record.totalCents + 1 },
  { totalCents: -1 },
  { usedClasses: 1 },
  { payments: [{ date: future, entries: [{ method: "cash", amount: 1 }] }] },
  {
    payments: [
      { date: paymentDay, entries: [{ method: "cash", amount: 2000000 }] },
    ],
  },
  {
    payments: [
      {
        date: paymentDay,
        entries: [
          { method: "cash", amount: 1 },
          { method: "cash", amount: 2 },
        ],
      },
    ],
  },
]) {
  const request = randomUUID(),
    badName = `Inválido ${request}`;
  await no(
    owner.rpc("register_paper_customer", {
      p_request: request,
      p_profile: { ...profile, name: badName },
      p_record: { ...record, ...change },
    }),
  );
  assert.deepEqual(
    await ok(owner.from("customers").select("id").eq("name", badName)),
    [],
  );
  assert.deepEqual(
    await ok(
      owner.from("import_batches").select("id").eq("request_id", request),
    ),
    [],
  );
}
if (closed.length) {
  const request = randomUUID(),
    closeStart = closed[0].month,
    closeEnd = closeStart.slice(0, 8) + "20";
  await no(
    owner.rpc("register_paper_customer", {
      p_request: request,
      p_profile: profile,
      p_record: { ...record, startsOn: closeStart, endsOn: closeEnd },
    }),
    "MONTH_CLOSED",
  );
  assert.deepEqual(
    await ok(
      owner.from("import_batches").select("id").eq("request_id", request),
    ),
    [],
  );
}
await no(anon.from("paper_enrollments").select("*"));
assert.deepEqual(await ok(monitor.from("paper_enrollments").select("*")), []);
await no(owner.from("paper_enrollments").insert({}));
console.log(
  "OK papel: vencidos, importes originales, saldo sin recibos ficticios, pagos mixtos históricos, saldo cero/sin abono, abonos nuevos idempotentes, clases previas sin asistencias inventadas, corrección de asistencia, rollback, meses cerrados y permisos owner-only.",
);
