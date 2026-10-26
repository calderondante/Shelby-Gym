import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  qa = parseEnv(readFileSync(".env.test.local", "utf8"));
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  )
)
  throw Error("Solo QA local.");
const owner = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const ids = [randomUUID(), randomUUID()],
  expense = randomUUID(),
  expenseMessage = randomUUID();
let contact = randomUUID();
let messages: { id: string; customer_id: string | null; body: string }[] = [],
  futureId = "",
  campaignId = "";
async function login(page: Page, role = "OWNER") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(qa[`E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[`E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Entrar al gimnasio" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
}
const sql = (input: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "shelby-qa-db",
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
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
test.beforeAll(async () => {
  expect(
    (
      await owner.auth.signInWithPassword({
        email: qa.E2E_OWNER_EMAIL!,
        password: qa.E2E_OWNER_PASSWORD!,
      })
    ).error,
  ).toBeNull();
  const actor = (await owner.auth.getUser()).data.user!.id;
  sql(
    `insert into public.customers(id,name,phone,marketing_opt_in,created_by) values('${ids[0]}','Ana Ríos','+12025550111',true,'${actor}'),('${ids[1]}','Bruno Gómez','+12025550112',true,'${actor}');`,
  );
  const template = await owner
    .from("communication_templates")
    .select("id")
    .eq("slug", "general-wa")
    .single();
  expect(template.error).toBeNull();
  const data = {
    title: "Bienvenida manual",
    channel: "whatsapp",
    segment: "selected",
    templateId: template.data!.id,
    body: "Hola {nombre} 👋\nTu saldo es {saldo}. {oferta}",
    offer: "Semana de bienvenida & nuevos turnos",
    scheduledFor: "",
  };
  const campaign = await owner.rpc("prepare_communication_campaign", {
    p_request: randomUUID(),
    p_data: data,
    p_customers: ids,
  });
  expect(campaign.error).toBeNull();
  campaignId = campaign.data!;
  const rows = await owner
    .from("communication_outbox")
    .select("id,customer_id,body")
    .eq("campaign_id", campaign.data!);
  expect(rows.error).toBeNull();
  messages = rows.data!;
  expect(messages).toHaveLength(2);
  const future = await owner.rpc("prepare_communication_campaign", {
    p_request: randomUUID(),
    p_data: {
      ...data,
      title: "Para mañana",
      scheduledFor: new Date(Date.now() + 86400000).toISOString(),
    },
    p_customers: [ids[0]],
  });
  expect(future.error).toBeNull();
  futureId = (
    await owner
      .from("communication_outbox")
      .select("id")
      .eq("campaign_id", future.data!)
      .single()
  ).data!.id;
  const existingContact = await owner
    .from("communication_owner_contacts")
    .select("id")
    .eq("phone", "+12025550113")
    .maybeSingle();
  if (existingContact.data) contact = existingContact.data.id;
  const billTemplate = (
    await owner
      .from("communication_templates")
      .select("id")
      .eq("slug", "expense-wa")
      .single()
  ).data!.id;
  sql(`insert into public.expenses(id,title,category,total_cents,due_on,request_id,created_by) values('${expense}','Electricidad','Servicios',100000,(now() at time zone 'America/Argentina/Buenos_Aires')::date,gen_random_uuid(),'${actor}');
 insert into public.communication_owner_contacts(id,name,phone,active,created_by) values('${contact}','Dueña de prueba','+12025550113',true,'${actor}') on conflict(id) do update set active=true,name=excluded.name;
 insert into public.communication_outbox(id,dedup_key,owner_contact_id,expense_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by)
 select '${expenseMessage}','manual-test:${expenseMessage}','${contact}','${expense}','expense','whatsapp',t.id,'Dueña de prueba','+12025550113',private.render_communication(t.body,jsonb_build_object('nombre','Dueña de prueba','dueno','Dueña de prueba','gimnasio',c.business_name,'gasto','Electricidad','importe',private.communication_money(100000),'saldo',private.communication_money(100000),'vencimiento',to_char((now() at time zone 'America/Argentina/Buenos_Aires')::date,'DD/MM/YYYY'),'dias','0')),now(),'${actor}' from public.communication_templates t cross join public.communication_settings c where t.id='${billTemplate}';`);
});
test("dos destinatarios privados, texto prefijado, revisión local y apertura sin enviar", async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto(`/comunicaciones?seccion=historial&campana=${campaignId}`);
  await expect(page.locator("article.operation-panel")).toHaveCount(2);
  const first = messages.find((m) => m.customer_id === ids[0])!,
    second = messages.find((m) => m.customer_id === ids[1])!;
  const a = page.locator("article").filter({
      has: page.locator(`a[href="/comunicaciones/whatsapp/${first.id}"]`),
    }),
    b = page.locator("article").filter({
      has: page.locator(`a[href="/comunicaciones/whatsapp/${second.id}"]`),
    });
  await expect(a).toContainText("Hola Ana Ríos");
  await expect(b).toContainText("Hola Bruno Gómez");
  const response = await page.request.get(
    `/comunicaciones/whatsapp/${first.id}`,
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(303);
  const url = new URL(response.headers().location);
  expect(url.host).toBe("wa.me");
  expect(url.pathname).toBe("/12025550111");
  expect(url.searchParams.get("text")).toBe(first.body);
  expect(response.headers()["cache-control"]).toContain("no-store");
  // Validate the universal-link handoff without navigating to WhatsApp or sending anything.
  const openLink = a.getByRole("link", { name: "Abrir WhatsApp de Ana Ríos" });
  await expect(openLink).toHaveAttribute(
    "href",
    `/comunicaciones/whatsapp/${first.id}`,
  );
  await expect(openLink).toHaveAttribute("target", "_blank");
  await expect(openLink).toHaveAttribute("rel", "noopener noreferrer");
  await a.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Solo WhatsApp por revisar" }).click();
  await expect(a).toHaveCount(0);
  await expect(b).toBeVisible();
  await page.getByRole("button", { name: "Solo WhatsApp por revisar" }).click();
  const state = await owner
    .from("communication_outbox")
    .select("status")
    .in(
      "id",
      messages.map((m) => m.id),
    );
  expect(state.data!.every((m) => m.status === "prepared")).toBe(true);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.bringToFront();
  await b
    .getByRole("button", { name: "Copiar texto para Bruno Gómez" })
    .click();
  await expect(b.getByRole("status")).toContainText("Texto copiado");
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  mkdirSync("qa-artifacts/manual-whatsapp", { recursive: true });
  await a.screenshot({ path: "qa-artifacts/manual-whatsapp/message-1440.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  await a.screenshot({ path: "qa-artifacts/manual-whatsapp/message-390.png" });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("revalida autorización, contacto, cancelación, fecha y saldo de boleta al abrir", async ({
  page,
}) => {
  await login(page);
  const m = messages.find((m) => m.customer_id === ids[0])!;
  const get = (id: string) =>
    page.request.get(`/comunicaciones/whatsapp/${id}`, { maxRedirects: 0 });
  sql(
    `update public.customers set marketing_opt_in=false where id='${ids[0]}';`,
  );
  expect((await get(m.id)).headers().location).toContain("aviso=contacto");
  sql(
    `update public.customers set marketing_opt_in=true,phone='+12025550119' where id='${ids[0]}';`,
  );
  expect((await get(m.id)).headers().location).toContain("aviso=contacto");
  sql(`update public.customers set phone='+12025550111' where id='${ids[0]}';`);
  expect((await get(futureId)).headers().location).toContain("aviso=fecha");
  expect((await get(expenseMessage)).headers().location).toContain(
    "https://wa.me/12025550113",
  );
  const actor = (await owner.auth.getUser()).data.user!.id;
  sql(
    `insert into public.expense_payments(expense_id,request_id,amount_cents,entries,occurred_on,created_by) values('${expense}',gen_random_uuid(),100000,'[{"method":"cash","amount":100000}]',(now() at time zone 'America/Argentina/Buenos_Aires')::date,'${actor}');`,
  );
  expect((await get(expenseMessage)).headers().location).toContain(
    "aviso=cambios",
  );
  expect(
    (await owner.rpc("cancel_communication", { p_id: m.id })).error,
  ).toBeNull();
  expect((await get(m.id)).headers().location).toContain("aviso=no-disponible");
  const other = messages.find((message) => message.customer_id === ids[1])!;
  sql(`insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by)
    values('${ids[1]}','${qa.E2E_ACTIVITY_ID}','Actividad QA','',100000,'ARS',(now() at time zone 'America/Argentina/Buenos_Aires')::date,(now() at time zone 'America/Argentina/Buenos_Aires')::date+30,30,'days',gen_random_uuid(),'manual-whatsapp-qa','${actor}');`);
  expect((await get(other.id)).headers().location).toContain("aviso=cambios");
  expect((await get(randomUUID())).headers().location).toContain(
    "aviso=no-disponible",
  );
});
test("un monitor o una sesión anónima no obtiene enlaces con mensajes privados", async ({
  page,
}) => {
  const id = messages[0].id;
  const anonymous = await page.request.get(`/comunicaciones/whatsapp/${id}`, {
    maxRedirects: 0,
  });
  expect(anonymous.headers().location).toContain("/login");
  await login(page, "MONITOR");
  const blocked = await page.request.get(`/comunicaciones/whatsapp/${id}`, {
    maxRedirects: 0,
  });
  expect(blocked.headers().location).toContain("/clientes");
  expect(blocked.headers().location).not.toContain("wa.me");
});
