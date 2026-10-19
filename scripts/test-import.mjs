import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url ?? ""))
  throw new Error("Import tests require disposable local Supabase.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = () =>
  createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const owner = client(),
  monitor = client(),
  anon = client();
for (const [db, role] of [
  [owner, "OWNER"],
  [monitor, "MONITOR"],
]) {
  const { error } = await db.auth.signInWithPassword({
    email: qa[`E2E_${role}_EMAIL`],
    password: qa[`E2E_${role}_PASSWORD`],
  });
  assert.equal(error, null);
}
const run = randomUUID().slice(0, 8);
const clients = [
  {
    row: 2,
    external_id: "01",
    name: `Importación QA ${run}`,
    phone: "",
    email: "",
    age_years: 31,
    age_as_of: "2026-01-01",
    periods: [
      {
        row: 2,
        external_id: "febrero",
        activity_id: qa.E2E_ACTIVITY_ID,
        starts_on: "2026-02-11",
        ends_on: "2026-03-11",
        total_cents: 2000000,
        balance_cents: 0,
        payments: [
          {
            external_id: "p1",
            date: "2026-02-11",
            entries: [
              { method: "cash", amount: 1000000 },
              { method: "transfer", amount: 1000000 },
            ],
          },
        ],
      },
      {
        row: 4,
        external_id: "marzo",
        activity_id: qa.E2E_ACTIVITY_ID,
        starts_on: "2026-03-11",
        ends_on: "2026-04-11",
        total_cents: 3000000,
        balance_cents: 500000,
        payments: [
          {
            external_id: "p2",
            date: "2026-03-11",
            entries: [{ method: "mercado_pago", amount: 1000000 }],
          },
        ],
      },
    ],
  },
];
const args = {
  p_request: randomUUID(),
  p_source: `qa-${run}`,
  p_currency: "ARS",
  p_clients: clients,
  p_commit: false,
};
async function ok(p, message) {
  const r = await p;
  assert.equal(r.error, null, `${message}: ${r.error?.message ?? ""}`);
  return r.data;
}
for (const db of [anon, monitor])
  assert.ok(
    (await db.rpc("import_gym_history", args)).error,
    "Owner permission required",
  );
const before = await ok(
  owner.from("customers").select("id", { count: "exact", head: true }),
  "Read",
);
void before;
const preview = await ok(owner.rpc("import_gym_history", args), "Preview");
assert.equal(preview.created, 1);
assert.deepEqual(preview.issues, []);
assert.equal(preview.committed, false);
assert.equal(
  (await owner.from("customers").select("id").eq("name", clients[0].name)).data
    .length,
  0,
  "Preview writes nothing",
);
const invalid = structuredClone(args);
invalid.p_clients[0].periods[1].balance_cents = 2900000;
invalid.p_commit = true;
const blocked = await ok(
  owner.rpc("import_gym_history", invalid),
  "Invalid amounts",
);
assert.ok(blocked.issues.length);
assert.equal(blocked.committed, false);
assert.equal(
  (await owner.from("customers").select("id").eq("name", clients[0].name)).data
    .length,
  0,
  "Invalid import is atomic",
);
args.p_commit = true;
const [one, two] = await Promise.all([
  ok(owner.rpc("import_gym_history", args), "Commit"),
  ok(owner.rpc("import_gym_history", args), "Concurrent replay"),
]);
assert.deepEqual(one, two);
assert.equal(one.committed, true);
const customer = await ok(
  owner.from("customers").select("*").eq("name", clients[0].name).single(),
  "Customer",
);
assert.equal(customer.age_years, 31);
assert.equal(customer.age_as_of, "2026-01-01");
const subs = await ok(
  owner
    .from("subscription_balances")
    .select("*")
    .eq("customer_id", customer.id)
    .order("starts_on"),
  "Historical periods",
);
assert.deepEqual(
  subs.map((s) => s.total_cents),
  [2000000, 3000000],
);
assert.deepEqual(
  subs.map((s) => s.balance_cents),
  [0, 500000],
);
assert.equal(subs[1].opening_paid_cents, 1500000);
const payments = await ok(
  owner
    .from("payment_batches")
    .select("occurred_on,payment_entries(method,amount_cents)")
    .in(
      "subscription_id",
      subs.map((s) => s.id),
    ),
  "Payments",
);
assert.equal(payments.length, 2);
assert.ok(payments.every((p) => p.occurred_on));
assert.ok(
  (
    await monitor.rpc("record_payment", {
      p_subscription: subs[1].id,
      p_request: randomUUID(),
      p_entries: [{ method: "cash", amount: 500001 }],
    })
  ).error,
  "Opening credit prevents overpayment",
);
await ok(
  monitor.rpc("record_payment", {
    p_subscription: subs[1].id,
    p_request: randomUUID(),
    p_entries: [{ method: "cash", amount: 500000 }],
  }),
  "Complete historical balance",
);
const completed = await ok(
  owner.from("subscription_balances").select("*").eq("id", subs[1].id).single(),
  "Result",
);
assert.equal(completed.balance_cents, 0);
assert.equal(completed.ends_on, "2026-04-11");
const repeat = await ok(
  owner.rpc("import_gym_history", { ...args, p_request: randomUUID() }),
  "Re-import",
);
assert.equal(repeat.created, 0);
assert.equal(repeat.skipped, 1);
const reordered = structuredClone(args);
reordered.p_request = randomUUID();
reordered.p_clients[0].row = 9;
reordered.p_clients[0].periods.reverse();
reordered.p_clients[0].periods.forEach((p) => {
  p.row += 10;
  p.payments.reverse();
  p.payments.forEach((pay) => pay.entries.reverse());
});
const reorderedResult = await ok(
  owner.rpc("import_gym_history", reordered),
  "Reordered re-import",
);
assert.equal(reorderedResult.skipped, 1);
const changed = structuredClone(args);
changed.p_request = randomUUID();
changed.p_clients[0].periods[0].total_cents = 2300000;
assert.ok(
  (await ok(owner.rpc("import_gym_history", changed), "Changed history")).issues
    .length,
  "Changed history cannot overwrite",
);
const duplicate = structuredClone(args);
duplicate.p_request = randomUUID();
duplicate.p_source = "other-" + run;
duplicate.p_clients[0].external_id = "other";
assert.ok(
  (
    await ok(
      owner.rpc("import_gym_history", duplicate),
      "Cross-source duplicate",
    )
  ).issues.length,
);
assert.equal(
  (await monitor.from("import_batches").select("*")).data.length,
  0,
  "Audit visible only to owner",
);
assert.ok(
  (await owner.from("import_batches").insert({ source: "bad" })).error,
  "No direct writes",
);
console.log(
  "OK: historical prices, age reference, mixed historical payments, opening credit, owner-only access, preview, rollback, concurrency, replay, duplicates and subsequent debt settlement.",
);
