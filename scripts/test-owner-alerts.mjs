import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
assert.match(
  env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /^http:\/\/(localhost|127\.0\.0\.1):54321$/,
  "Solo QA local",
);
const options = { auth: { persistSession: false, autoRefreshToken: false } },
  url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, options),
  owner = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options),
  monitor = createClient(
    url,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
const ok = async (p, label) => {
  const r = await p;
  assert.equal(r.error, null, label);
  return r.data;
};
await ok(
  owner.auth.signInWithPassword({
    email: qa.E2E_OWNER_EMAIL,
    password: qa.E2E_OWNER_PASSWORD,
  }),
  "Acceso del dueño",
);
await ok(
  monitor.auth.signInWithPassword({
    email: qa.E2E_MONITOR_EMAIL,
    password: qa.E2E_MONITOR_PASSWORD,
  }),
  "Acceso del monitor",
);
const original = await ok(
  owner.from("owner_notification_settings").select("*").single(),
  "Preferencias",
);
const restoreSettings = () => ({
  enabled: original.enabled,
  customersEnabled: original.customers_enabled,
  expensesEnabled: original.expenses_enabled,
  notifyBefore: original.notify_before,
  daysBefore: original.days_before,
  notifyOnDue: original.notify_on_due,
  notifyOverdue: original.notify_overdue,
  overdueEvery: original.overdue_every,
  sendHour: original.send_hour,
});
const run = randomUUID(),
  workerEmail = `notification-worker-${run}@example.test`,
  workerPassword = randomBytes(32).toString("base64url");
const identities = [],
  endpoints = [];
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Argentina/Buenos_Aires",
}).format(new Date());
const due = new Date(today + "T12:00:00Z");
due.setUTCDate(due.getUTCDate() + 1);
const future = due.toISOString().slice(0, 10);
let worker;
try {
  for (const correct of [true, false]) {
    const email = correct
      ? workerEmail
      : `notification-outsider-${run}@example.test`;
    const created = await ok(
      admin.auth.admin.createUser({
        email,
        password: workerPassword,
        email_confirm: true,
        ...(correct
          ? { app_metadata: { shelby_notification_worker: true } }
          : { user_metadata: { shelby_notification_worker: true } }),
      }),
      "Crear identidad QA",
    );
    identities.push(created.user.id);
    const client = createClient(
      url,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      options,
    );
    await ok(
      client.auth.signInWithPassword({ email, password: workerPassword }),
      "Acceso QA",
    );
    if (correct) worker = client;
    else
      assert.ok(
        (await client.rpc("claim_owner_push_jobs", { p_limit: 8 })).error,
        "Metadata editable no habilita worker",
      );
  }
  assert.deepEqual(
    await ok(worker.from("customers").select("id"), "Lectura worker sin staff"),
    [],
  );
  assert.deepEqual(
    await ok(
      worker.from("owner_alerts").select("*"),
      "Worker no ve bandeja de dueños",
    ),
    [],
  );
  assert.deepEqual(
    await ok(monitor.from("owner_alerts").select("*"), "Monitor sin bandeja"),
    [],
  );
  assert.ok(
    (
      await monitor.rpc("configure_owner_notifications", {
        p_revision: original.revision,
        p_data: restoreSettings(),
      })
    ).error,
  );
  await ok(
    owner.rpc("configure_owner_notifications", {
      p_revision: original.revision,
      p_data: {
        ...restoreSettings(),
        enabled: true,
        customersEnabled: true,
        expensesEnabled: true,
        notifyBefore: true,
        notifyOnDue: true,
        notifyOverdue: true,
        sendHour: 0,
        daysBefore: 3,
        overdueEvery: 1,
      },
    }),
    "Configurar prueba",
  );
  assert.ok(
    (
      await owner.rpc("configure_owner_notifications", {
        p_revision: original.revision,
        p_data: restoreSettings(),
      })
    ).error,
    "Control de revisión",
  );
  const number =
      "00004-" + String(Math.floor(Math.random() * 90000000) + 10000000),
    supplier = "Proveedor de prueba " + run.slice(0, 8);
  const request = randomUUID(),
    data = {
      title: "Electricidad de prueba",
      category: "Servicios",
      amount: 125050,
      dueOn: today,
      notes: "Solo QA local",
      supplier,
      invoiceNumber: number,
    };
  const expense = await ok(
    owner.rpc("save_expense", {
      p_id: null,
      p_revision: 0,
      p_request: request,
      p_data: data,
    }),
    "Guardar factura",
  );
  assert.equal(
    await ok(
      owner.rpc("save_expense", {
        p_id: null,
        p_revision: 0,
        p_request: request,
        p_data: data,
      }),
      "Repetición idempotente",
    ),
    expense,
  );
  const duplicate = await owner.rpc("save_expense", {
    p_id: null,
    p_revision: 0,
    p_request: randomUUID(),
    p_data: data,
  });
  assert.equal(duplicate.error?.message, "DUPLICATE_INVOICE");
  let rows = await ok(
    owner.from("owner_alerts").select("*").eq("reference_id", expense),
    "Aviso inicial",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_read, false);
  const ownerId = (await owner.auth.getUser()).data.user.id;
  await ok(
    owner
      .from("owner_notification_reads")
      .upsert({ staff_id: ownerId, alert_key: rows[0].alert_key }),
    "Marcar revisión",
  );
  rows = await ok(
    owner.from("owner_alerts").select("*").eq("reference_id", expense),
    "Lectura persistente",
  );
  assert.equal(rows[0].is_read, true);
  const denied = await monitor
    .from("owner_notification_reads")
    .insert({ staff_id: ownerId, alert_key: "evil" });
  assert.ok(denied.error);
  const keys = webPush.generateVAPIDKeys(),
    auth = randomBytes(16).toString("base64url");
  const makeDevice = async () => {
    const endpoint = "https://web.push.apple.com/qa-only-" + randomUUID();
    endpoints.push(endpoint);
    await ok(
      owner.rpc("register_owner_push", {
        p_data: { endpoint, p256dh: keys.publicKey, auth },
      }),
      "Registrar dispositivo ficticio",
    );
    return endpoint;
  };
  assert.ok(
    (
      await owner.rpc("register_owner_push", {
        p_data: {
          endpoint: "https://127.0.0.1/private",
          p256dh: keys.publicKey,
          auth,
        },
      })
    ).error,
    "SSRF rechazado en DB",
  );
  const endpoint = await makeDevice();
  assert.equal(
    await ok(
      owner.rpc("owner_push_status", { p_endpoint: endpoint }),
      "Estado",
    ),
    true,
  );
  const two = await Promise.all([
    worker.rpc("claim_owner_push_jobs", { p_limit: 50 }),
    worker.rpc("claim_owner_push_jobs", { p_limit: 50 }),
  ]);
  for (const r of two) assert.equal(r.error, null);
  const claimed = two
    .flatMap((r) => r.data)
    .filter((r) => r.endpoint === endpoint);
  assert.equal(claimed.length, 1, "Un solo claim concurrente");
  assert.deepEqual(
    Object.keys(claimed[0]).sort(),
    ["auth", "endpoint", "id", "leaseId", "p256dh"].sort(),
    "Worker recibe capacidades, no datos de clientes",
  );
  const first = claimed[0];
  assert.ok(
    (
      await worker.rpc("finish_owner_push_job", {
        p_id: first.id,
        p_lease: randomUUID(),
        p_status: "accepted",
      })
    ).error,
    "Lease ajeno rechazado",
  );
  await ok(
    worker.rpc("finish_owner_push_job", {
      p_id: first.id,
      p_lease: first.leaseId,
      p_status: "accepted",
      p_code: 201,
    }),
    "Aceptación simulada sin enviar",
  );
  assert.ok(
    !(
      await ok(
        worker.rpc("claim_owner_push_jobs", { p_limit: 50 }),
        "Deduplicación",
      )
    ).some((j) => j.endpoint === endpoint),
  );
  await ok(
    owner.rpc("pay_expense", {
      p_expense: expense,
      p_request: randomUUID(),
      p_entries: [{ method: "transfer", amount: 50000 }],
      p_reverse: null,
      p_reason: "",
    }),
    "Pago parcial",
  );
  rows = await ok(
    owner.from("owner_alerts").select("*").eq("reference_id", expense),
    "Saldo actualizado",
  );
  assert.equal(rows[0].balance_cents, 75050);
  assert.equal(rows[0].is_read, false);
  await ok(
    owner.rpc("pay_expense", {
      p_expense: expense,
      p_request: randomUUID(),
      p_entries: [{ method: "cash", amount: 75050 }],
      p_reverse: null,
      p_reason: "",
    }),
    "Saldar",
  );
  assert.deepEqual(
    await ok(
      owner.from("owner_alerts").select("*").eq("reference_id", expense),
      "Aviso retirado al pagar",
    ),
    [],
  );
  const pending = await ok(
    owner.rpc("save_expense", {
      p_id: null,
      p_revision: 0,
      p_request: randomUUID(),
      p_data: {
        title: "Factura pendiente de prueba",
        category: "Servicios",
        amount: 12500050,
        dueOn: future,
        notes: "Solo QA local",
        supplier: "Electro del Sur",
        invoiceNumber: number + "-P",
      },
    }),
    "Factura para UI",
  );
  const previous = await worker.auth.getSession(),
    frozen = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      ...options,
      global: {
        headers: {
          Authorization: "Bearer " + previous.data.session.access_token,
        },
      },
    });
  await worker.auth.signOut({ scope: "local" });
  assert.ok(
    (await frozen.rpc("claim_owner_push_jobs", { p_limit: 8 })).error,
    "JWT worker revocado",
  );
  const noSessionEndpoint = await makeDevice();
  await owner.auth.signOut({ scope: "local" });
  await ok(
    worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    }),
    "Worker nuevo",
  );
  assert.ok(
    !(
      await ok(
        worker.rpc("claim_owner_push_jobs", { p_limit: 50 }),
        "Sin sesión de dueño",
      )
    ).some((j) => j.endpoint === noSessionEndpoint),
    "Un dispositivo sin sesión no recibe push",
  );
  const extra = {
    ...qa,
    E2E_ALERT_EXPENSE_ID: pending,
    E2E_ALERT_DUE: future,
    E2E_ALERT_SUPPLIER: "Electro del Sur",
    E2E_ALERT_INVOICE_NUMBER: number + "-P",
  };
  writeFileSync(
    ".env.test.local",
    Object.entries(extra)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(
    "OK: factura idempotente/duplicados, revisión, pago parcial/total, RLS dueño/monitor/worker, identidad de job mínima, claims concurrentes, lease, deduplicación y revocación. Sin envíos a proveedores.",
  );
} finally {
  await owner.auth.signInWithPassword({
    email: qa.E2E_OWNER_EMAIL,
    password: qa.E2E_OWNER_PASSWORD,
  });
  const current = await owner
    .from("owner_notification_settings")
    .select("revision")
    .single();
  if (current.data)
    await owner.rpc("configure_owner_notifications", {
      p_revision: current.data.revision,
      p_data: restoreSettings(),
    });
  if (endpoints.length)
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "shelby-qa-db",
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input:
          "delete from private.owner_push_subscriptions where endpoint in(" +
          endpoints.map((x) => "'" + x + "'").join(",") +
          ");",
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
  for (const id of identities) await admin.auth.admin.deleteUser(id);
}
