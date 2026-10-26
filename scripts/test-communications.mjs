import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL || "",
  )
)
  throw Error("Solo datos sintéticos locales.");
const client = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const owner = client(),
  monitor = client(),
  anon = client(),
  outsider = client();
const ok = async (promise, label = "Operación") => {
  const r = await promise;
  assert.equal(r.error, null, `${label}: ${r.error?.message}`);
  return r.data;
};
const no = async (promise, message) => {
  const r = await promise;
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
const actor = (await owner.auth.getUser()).data.user.id;
const sql = (query) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      process.env.SUPABASE_TEST_DB_CONTAINER || "supabase_db_shelby-gym",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: query, encoding: "utf8" },
  );
const run = randomUUID().slice(0, 8),
  ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
  activity = randomUUID();
const day = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
}).format(new Date());
sql(`insert into public.activities(id,name,price_cents,duration_count,duration_unit,created_by) values('${activity}','Comms QA ${run}',3000000,1,'months','${actor}');
insert into public.customers(id,name,phone,instagram,marketing_opt_in,instagram_marketing_opt_in,created_by) values
('${ids[0]}','Ana QA ${run}','+54 9 11 1234 5678','@ana.qa',true,true,'${actor}'),
('${ids[1]}','Martín QA ${run}','+5491112345678','@martin.qa',true,false,'${actor}'),
('${ids[2]}','Sin permiso QA ${run}','+5491112345678','@sin.qa',false,false,'${actor}'),
('${ids[3]}','Sin cuota QA ${run}','+5491112345678','@pack.qa',true,true,'${actor}');
insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by)
select id,'${activity}','Comms QA ${run}','',3000000,'ARS',('${day}'::date-interval '3 months')::date,('${day}'::date-interval '2 months')::date,1,'months',gen_random_uuid(),'fixture','${actor}' from public.customers where id=any(array['${ids[0]}','${ids[1]}','${ids[2]}']::uuid[]);`);
const tables = [
  "communication_settings",
  "communication_templates",
  "communication_owner_contacts",
  "communication_rules",
  "communication_rule_customers",
  "communication_outbox",
];
for (const table of tables) {
  await no(anon.from(table).select("*"));
  assert.deepEqual(await ok(monitor.from(table).select("*")), []);
  await no(owner.from(table).insert({}));
}
await no(
  monitor.rpc("prepare_communication_automations", { p_day: day }),
  "FORBIDDEN",
);
await no(anon.rpc("prepare_communication_automations", { p_day: day }));
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const outsiderEmail = `comms-outsider-${run}@example.test`,
  outsiderPassword = randomBytes(24).toString("base64url");
const outsiderAccount = await ok(
  admin.auth.admin.createUser({
    email: outsiderEmail,
    password: outsiderPassword,
    email_confirm: true,
  }),
);
await ok(
  outsider.auth.signInWithPassword({
    email: outsiderEmail,
    password: outsiderPassword,
  }),
);
for (const table of tables)
  assert.deepEqual(await ok(outsider.from(table).select("*")), []);
for (const db of [monitor, outsider])
  for (const [name, args] of [
    ["save_communication_settings", { p_revision: 1, p_data: {} }],
    ["save_communication_template", { p_id: null, p_revision: 0, p_data: {} }],
    ["save_communication_owner", { p_id: null, p_revision: 0, p_data: {} }],
    [
      "save_communication_rule",
      { p_kind: "recovery", p_revision: 1, p_data: {}, p_customers: [] },
    ],
    [
      "prepare_communication_campaign",
      { p_request: randomUUID(), p_data: {}, p_customers: [] },
    ],
    ["prepare_communication_automations", { p_day: day }],
    ["cancel_communication", { p_id: randomUUID() }],
  ])
    await no(db.rpc(name, args), "FORBIDDEN");
await ok(admin.auth.admin.deleteUser(outsiderAccount.user.id));
const templates = await ok(owner.from("communication_templates").select("*")),
  recovery = templates.find((t) => t.slug === "recovery-wa"),
  ig = templates.find((t) => t.slug === "recovery-ig"),
  billTemplate = templates.find((t) => t.slug === "expense-wa");
const campaign = {
  p_request: randomUUID(),
  p_data: {
    title: `Regreso ${run}`,
    channel: "whatsapp",
    segment: "recovery",
    templateId: recovery.id,
    body: "Hola {nombre}, {oferta}. Saldo: {saldo}",
    offer: "Volvé a Shelby",
    scheduledFor: `${day}T09:00:00-03:00`,
  },
  p_customers: ids.slice(0, 2),
};
const campaignId = await ok(
  owner.rpc("prepare_communication_campaign", campaign),
  "Preparar campaña",
);
assert.equal(
  await ok(owner.rpc("prepare_communication_campaign", campaign)),
  campaignId,
);
await no(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_data: { ...campaign.p_data, offer: "Otra" },
  }),
  "REQUEST_CONFLICT",
);
let rows = await ok(
  owner.from("communication_outbox").select("*").eq("campaign_id", campaignId),
);
assert.equal(rows.length, 2);
assert.equal(rows[0].status, "prepared");
assert.ok(rows.every((r) => r.body.includes("30.000,00")));
assert.ok(rows.some((r) => r.body.includes("Ana QA")));
assert.ok(rows.some((r) => r.body.includes("Martín QA")));
assert.equal(rows[0].scheduled_for, `${day}T12:00:00+00:00`);
const badRequest = randomUUID();
await no(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_request: badRequest,
    p_customers: [ids[0], ids[2]],
  }),
  "RECIPIENTS_CHANGED",
);
assert.deepEqual(
  await ok(owner.from("campaigns").select("id").eq("request_id", badRequest)),
  [],
);
await no(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_request: randomUUID(),
    p_customers: [ids[0], ids[0]],
  }),
  "SELECT_RECIPIENTS",
);
await no(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_request: randomUUID(),
    p_customers: [ids[3]],
  }),
  "RECIPIENTS_CHANGED",
);
await no(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_request: randomUUID(),
    p_data: { ...campaign.p_data, channel: "instagram", templateId: ig.id },
    p_customers: [ids[1]],
  }),
  "RECIPIENTS_CHANGED",
);
await ok(
  owner.rpc("prepare_communication_campaign", {
    ...campaign,
    p_request: randomUUID(),
    p_data: { ...campaign.p_data, channel: "instagram", templateId: ig.id },
    p_customers: [ids[0]],
  }),
);
await no(
  monitor.rpc("cancel_communication", { p_id: rows[0].id }),
  "FORBIDDEN",
);
await ok(owner.rpc("cancel_communication", { p_id: rows[0].id }));
await no(
  owner.rpc("cancel_communication", { p_id: rows[0].id }),
  "MESSAGE_UNAVAILABLE",
);
await no(
  owner
    .from("communication_outbox")
    .update({ status: "sent" })
    .eq("id", rows[1].id),
);
await no(
  owner.rpc("save_communication_template", {
    p_id: null,
    p_revision: 0,
    p_data: {
      title: "Mal token",
      channel: "whatsapp",
      purpose: "general",
      body: "Hola {secret}",
    },
  }),
  "UNKNOWN_MESSAGE_VARIABLE",
);
const c = await ok(owner.from("communication_settings").select("*").single());
await ok(
  owner.rpc("save_communication_settings", {
    p_revision: c.revision,
    p_data: {
      businessName: "Shelby Gym",
      whatsappPhone: "",
      instagramHandle: "",
    },
  }),
);
await no(
  owner.rpc("save_communication_settings", {
    p_revision: c.revision,
    p_data: { businessName: "Otro", whatsappPhone: "", instagramHandle: "" },
  }),
  "STALE_COMMUNICATION",
);
const ruleData = {
  enabled: true,
  channel: "whatsapp",
  templateId: recovery.id,
  sendHour: 9,
  audience: "selected",
  notifyBefore: true,
  daysBefore: 3,
  notifyOnDue: true,
  notifyOverdue: true,
  overdueEvery: 1,
  recurringOnly: true,
  offer: "Regreso QA",
};
let rules = await ok(owner.from("communication_rules").select("*"));
await ok(
  owner.rpc("save_communication_rule", {
    p_kind: "recovery",
    p_revision: rules.find((r) => r.kind === "recovery").revision,
    p_data: ruleData,
    p_customers: ids.slice(0, 2),
  }),
);
await ok(owner.rpc("prepare_communication_automations", { p_day: day }));
assert.equal(
  (
    await ok(
      owner
        .from("communication_outbox")
        .select("*")
        .eq("source", "recovery")
        .in("customer_id", ids),
    )
  ).length,
  2,
);
await ok(owner.rpc("prepare_communication_automations", { p_day: day }));
assert.equal(
  (
    await ok(
      owner
        .from("communication_outbox")
        .select("*")
        .eq("source", "recovery")
        .in("customer_id", ids),
    )
  ).length,
  2,
);
sql(`update public.customers set marketing_opt_in=false where id='${ids[0]}';`);
await ok(owner.rpc("prepare_communication_automations", { p_day: day }));
assert.equal(
  (
    await ok(
      owner
        .from("communication_outbox")
        .select("*")
        .eq("source", "recovery")
        .eq("customer_id", ids[0]),
    )
  )[0].status,
  "cancelled",
);
const contact = await ok(
  owner.rpc("save_communication_owner", {
    p_id: null,
    p_revision: 0,
    p_data: {
      name: `Lucía ${run}`,
      phone: `+54911${String(Date.now()).slice(-8)}`,
      active: true,
    },
  }),
);
const expense = randomUUID(),
  expenseTemplate = randomUUID();
sql(`insert into public.expense_templates(id,title,category,amount_cents,due_day,active,created_by) values('${expenseTemplate}','Luz QA ${run}','Servicios',4200000,1,true,'${actor}');
insert into public.expenses(id,title,category,total_cents,due_on,template_id,template_month,request_id,created_by) values('${expense}','Luz QA ${run}','Servicios',4200000,'${day}','${expenseTemplate}',date_trunc('month','${day}'::date)::date,gen_random_uuid(),'${actor}');`);
rules = await ok(owner.from("communication_rules").select("*"));
await ok(
  owner.rpc("save_communication_rule", {
    p_kind: "expense",
    p_revision: rules.find((r) => r.kind === "expense").revision,
    p_data: { ...ruleData, templateId: billTemplate.id, overdueEvery: 3 },
    p_customers: [],
  }),
);
const shift = (n) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000)
    .toISOString()
    .slice(0, 10);
for (const n of [-3, 0, 1, 4])
  await ok(owner.rpc("prepare_communication_automations", { p_day: shift(n) }));
let notices = await ok(
  owner
    .from("communication_outbox")
    .select("*")
    .eq("expense_id", expense)
    .eq("owner_contact_id", contact),
);
assert.equal(notices.length, 4);
for (const n of [-2, 2, 3])
  await ok(owner.rpc("prepare_communication_automations", { p_day: shift(n) }));
assert.equal(
  (
    await ok(
      owner
        .from("communication_outbox")
        .select("*")
        .eq("expense_id", expense)
        .eq("owner_contact_id", contact),
    )
  ).length,
  4,
);
await ok(
  owner.rpc("pay_expense", {
    p_expense: expense,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 1200000 }],
  }),
);
await ok(owner.rpc("prepare_communication_automations", { p_day: day }));
notices = await ok(
  owner
    .from("communication_outbox")
    .select("*")
    .eq("expense_id", expense)
    .eq("owner_contact_id", contact),
);
assert.equal(notices.length, 4);
assert.ok(notices.some((r) => r.body.includes("30.000,00")));
await ok(
  owner.rpc("pay_expense", {
    p_expense: expense,
    p_request: randomUUID(),
    p_entries: [{ method: "transfer", amount: 3000000 }],
  }),
);
await ok(owner.rpc("prepare_communication_automations", { p_day: day }));
assert.ok(
  (
    await ok(
      owner.from("communication_outbox").select("*").eq("expense_id", expense),
    )
  ).every((m) => m.status === "cancelled"),
);
// Leave rules disabled so subsequent browser tests start without unintended plans.
for (const r of await ok(owner.from("communication_rules").select("*")))
  await ok(
    owner.rpc("save_communication_rule", {
      p_kind: r.kind,
      p_revision: r.revision,
      p_data: {
        ...ruleData,
        enabled: false,
        templateId: r.kind === "expense" ? billTemplate.id : recovery.id,
      },
      p_customers: [],
    }),
  );
console.log(
  "OK comunicaciones: owner-only RLS/RPC, consentimiento separado, rollback de lote, idempotencia, horarios AR, personalización, cuotas y deuda intactas, reglas de 2 meses, boletas antes/al vencer/repetidas, pagos parciales y cancelación al saldar. Sin envíos.",
);
