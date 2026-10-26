import "server-only";
import { requireOwner, requireSettings } from "@/features/gym/server/session";
import { allPages } from "@/features/gym/server/operations";
import type { Recipient } from "../domain/messages";
export async function getCommunications(campaignId?: string) {
  const [{ db }, gym] = await Promise.all([requireOwner(), requireSettings()]);
  let outboxQuery = db
    .from("communication_outbox")
    .select(
      "id,campaign_id,customer_id,owner_contact_id,expense_id,source,channel,recipient_name,destination,body,scheduled_for,status,note,created_at,updated_at",
    )
    .order("scheduled_for", { ascending: false })
    .order("id")
    .limit(campaignId ? 500 : 200);
  if (campaignId) outboxQuery = outboxQuery.eq("campaign_id", campaignId);
  const [
    config,
    templates,
    owners,
    rules,
    selections,
    customers,
    outbox,
    campaigns,
  ] = await Promise.all([
    db.from("communication_settings").select("*").eq("id", true).single(),
    allPages((n) =>
      db
        .from("communication_templates")
        .select("*")
        .order("purpose")
        .order("title")
        .order("id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("communication_owner_contacts")
        .select("*")
        .order("name")
        .order("id")
        .range(n, n + 999),
    ),
    db.from("communication_rules").select("*").order("kind"),
    allPages((n) =>
      db
        .from("communication_rule_customers")
        .select("*")
        .order("rule_kind")
        .order("customer_id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("customer_overview")
        .select(
          "id,name,phone,instagram,marketing_opt_in,instagram_marketing_opt_in,last_end,balance_cents,activity_names,status",
        )
        .neq("status", "retired")
        .order("name")
        .order("id")
        .range(n, n + 999),
    ),
    outboxQuery,
    db
      .from("campaigns")
      .select(
        "id,title,status,channel,message,created_at,campaign_recipients(customer_id)",
      )
      .order("created_at", { ascending: false })
      .order("id")
      .limit(100),
  ]);
  if (config.error || rules.error || outbox.error || campaigns.error)
    throw new Error("No pudimos cargar Comunicaciones. Volvé a intentar.");
  const recipients: Recipient[] = customers.map((c) => ({
    id: c.id!,
    name: c.name!,
    phone: c.phone ?? "",
    instagram: c.instagram ?? "",
    status: c.status!,
    marketingOptIn: c.marketing_opt_in ?? false,
    instagramMarketingOptIn: c.instagram_marketing_opt_in ?? false,
    lastEnd: c.last_end,
    balance: c.balance_cents ?? 0,
    activities: c.activity_names ?? "Sin actividad",
  }));
  return {
    config: config.data,
    templates,
    owners,
    rules: rules.data,
    selections,
    recipients,
    outbox: outbox.data,
    campaigns: campaigns.data,
    gym,
  };
}
