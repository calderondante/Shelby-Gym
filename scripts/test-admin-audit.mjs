import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL || "",
  )
)
  throw Error("Solo Supabase local con datos ficticios.");
const client = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const owner = client(),
  monitor = client();
const ok = async (p, label = "Operación") => {
  const r = await p;
  assert.equal(r.error, null, `${label}: ${r.error?.message}`);
  return r.data;
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
const observations = [];
async function verify(name, fn) {
  try {
    await fn();
    observations.push({ name, status: "passed" });
  } catch (e) {
    observations.push({ name, status: "failed", error: e.message });
  }
}
const original = await ok(owner.from("gym_settings").select("*").single());
await verify(
  "La zona horaria no puede reinterpretar movimientos existentes",
  async () => {
    const nextZone =
      original.time_zone === "UTC" ? "America/Argentina/Buenos_Aires" : "UTC";
    const result = await owner.rpc("configure_gym", {
      p_currency: original.currency,
      p_time_zone: nextZone,
    });
    if (!result.error)
      await ok(
        owner.rpc("configure_gym", {
          p_currency: original.currency,
          p_time_zone: original.time_zone,
        }),
        "Restaurar configuración QA",
      );
    assert.equal(result.error?.message, "TIME_ZONE_LOCKED");
  },
);
await verify(
  "El monitor no puede hacerse dueño mediante metadata del perfil",
  async () => {
    await ok(
      monitor.auth.updateUser({
        data: { role: "owner", staff_role: "owner", active: true },
      }),
    );
    const result = await monitor.rpc("save_communication_owner", {
      p_id: null,
      p_revision: 0,
      p_data: {
        name: "Intruso sintético",
        phone: "+5491112345678",
        active: true,
      },
    });
    assert.equal(result.error?.message, "FORBIDDEN");
    await ok(
      monitor.auth.updateUser({
        data: { role: null, staff_role: null, active: null },
      }),
    );
  },
);
await verify(
  "No se duplica una cuota ni se cobra dos veces el mismo saldo",
  async () => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: original.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const activity = await ok(
      owner.rpc("save_activity", {
        p_id: null,
        p_revision: 0,
        p_data: {
          name: `Auditoría ${randomUUID().slice(0, 8)}`,
          description: "Fixture aislado",
          price_cents: 4000000,
          offer_price_cents: null,
          offer_label: "",
          duration_unit: "months",
          duration_count: 1,
          active: true,
        },
      }),
    );
    const args = {
      p_request: randomUUID(),
      p_customer_id: null,
      p_customer: { name: "Sofía de auditoría", phone: "", birthMonth: 2 },
      p_activity: activity,
      p_expected_price: 4000000,
      p_expected_revision: 1,
      p_expected_start: day,
      p_entries: [{ method: "transfer", amount: 2000000 }],
    };
    const customer = await ok(owner.rpc("enroll_customer", args));
    const second = await owner.rpc("enroll_customer", {
      ...args,
      p_request: randomUUID(),
      p_customer_id: customer,
    });
    assert.equal(second.error?.message, "ALREADY_ACTIVE");
    const periods = await ok(
      owner
        .from("subscription_balances")
        .select("id,total_cents,paid_cents,balance_cents")
        .eq("customer_id", customer),
    );
    assert.equal(periods.length, 1);
    assert.equal(periods[0].balance_cents, 2000000);
    const payments = await Promise.all([
      owner.rpc("record_payment", {
        p_subscription: periods[0].id,
        p_request: randomUUID(),
        p_entries: [{ method: "cash", amount: 2000000 }],
      }),
      monitor.rpc("record_payment", {
        p_subscription: periods[0].id,
        p_request: randomUUID(),
        p_entries: [{ method: "transfer", amount: 2000000 }],
      }),
    ]);
    assert.equal(payments.filter((p) => !p.error).length, 1);
    assert.equal(payments.find((p) => p.error)?.error.message, "OVERPAYMENT");
  },
);
console.log(JSON.stringify(observations));
assert.equal(observations.filter((o) => o.status === "failed").length, 0);
