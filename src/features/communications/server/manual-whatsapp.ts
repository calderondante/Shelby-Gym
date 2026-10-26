import "server-only";
import { requireOwner, requireSettings } from "@/features/gym/server/session";
import { todayIn, endDate } from "@/features/gym/domain/dates";
import { uuid } from "@/features/gym/validation/contracts";
import { normalizePhone, renderMessage } from "../domain/messages";
import { messageDate, messageMoney, whatsappUrl } from "../domain/whatsapp";
export async function prepareManualWhatsapp(
  id: string,
): Promise<{ url: string } | { reason: string }> {
  const { db } = await requireOwner();
  if (!uuid.safeParse(id).success) return { reason: "no-disponible" };
  const result = await db
    .from("communication_outbox")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) return { reason: "conexion" };
  const m = result.data;
  if (!m || m.status !== "prepared" || m.channel !== "whatsapp")
    return { reason: "no-disponible" };
  if (new Date(m.scheduled_for).getTime() > Date.now())
    return { reason: "fecha" };
  const gym = await requireSettings();
  const today = todayIn(gym.time_zone);
  const business = await db
    .from("communication_settings")
    .select("business_name")
    .eq("id", true)
    .single();
  if (business.error) return { reason: "conexion" };
  let expected: string;
  if (m.source === "expense") {
    if (!m.owner_contact_id || !m.expense_id || !m.template_id)
      return { reason: "no-disponible" };
    const [owner, expense, template] = await Promise.all([
      db
        .from("communication_owner_contacts")
        .select("name,phone,active")
        .eq("id", m.owner_contact_id)
        .maybeSingle(),
      db
        .from("expense_balances")
        .select("title,total_cents,balance_cents,due_on")
        .eq("id", m.expense_id)
        .maybeSingle(),
      db
        .from("communication_templates")
        .select("body")
        .eq("id", m.template_id)
        .maybeSingle(),
    ]);
    if (owner.error || expense.error || template.error)
      return { reason: "conexion" };
    if (
      !owner.data?.active ||
      normalizePhone(owner.data.phone) !== m.destination ||
      owner.data.name !== m.recipient_name
    )
      return { reason: "contacto" };
    if (
      !expense.data ||
      (expense.data.balance_cents ?? 0) <= 0 ||
      !template.data ||
      !expense.data.due_on
    )
      return { reason: "cambios" };
    if (todayIn(gym.time_zone, new Date(m.scheduled_for)) !== today)
      return { reason: "cambios" };
    const days = Math.abs(
      Math.round(
        (Date.parse(today + "T12:00:00Z") -
          Date.parse(expense.data.due_on + "T12:00:00Z")) /
          86400000,
      ),
    );
    expected = renderMessage(template.data.body, {
      nombre: owner.data.name,
      dueno: owner.data.name,
      gimnasio: business.data.business_name,
      gasto: expense.data.title ?? "",
      importe: messageMoney(expense.data.total_cents ?? 0),
      saldo: messageMoney(expense.data.balance_cents ?? 0),
      vencimiento: messageDate(expense.data.due_on),
      dias: String(days),
    });
  } else {
    if (!m.customer_id) return { reason: "no-disponible" };
    const [customer, campaign, template, rule] = await Promise.all([
      db
        .from("customer_overview")
        .select(
          "id,name,phone,status,marketing_opt_in,last_end,balance_cents,activity_names",
        )
        .eq("id", m.customer_id)
        .maybeSingle(),
      m.campaign_id
        ? db
            .from("campaigns")
            .select("message,offer,segment,status")
            .eq("id", m.campaign_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      m.source === "recovery" && m.template_id
        ? db
            .from("communication_templates")
            .select("body")
            .eq("id", m.template_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      m.source === "recovery"
        ? db
            .from("communication_rules")
            .select("offer,enabled")
            .eq("kind", "recovery")
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (customer.error || campaign.error || template.error || rule.error)
      return { reason: "conexion" };
    const c = customer.data;
    if (
      !c ||
      c.status === "retired" ||
      !c.marketing_opt_in ||
      normalizePhone(c.phone ?? "") !== m.destination ||
      c.name !== m.recipient_name
    )
      return { reason: "contacto" };
    const recovery =
      m.source === "recovery" || campaign.data?.segment === "recovery";
    if (recovery && (!c.last_end || endDate(c.last_end, 2, "months") > today))
      return { reason: "cambios" };
    if (
      m.source === "campaign" &&
      (!campaign.data || campaign.data.status !== "prepared")
    )
      return { reason: "no-disponible" };
    if (m.source === "recovery" && (!template.data || !rule.data?.enabled))
      return { reason: "cambios" };
    const body =
      m.source === "recovery" ? template.data!.body : campaign.data!.message;
    const offer =
      m.source === "recovery" ? rule.data!.offer : campaign.data!.offer;
    expected = renderMessage(body, {
      nombre: c.name ?? "",
      gimnasio: business.data.business_name,
      actividad: c.activity_names ?? "Sin actividad",
      vencimiento: messageDate(c.last_end),
      saldo: messageMoney(c.balance_cents ?? 0),
      oferta: offer,
    });
  }
  if (expected !== m.body) return { reason: "cambios" };
  const url = whatsappUrl(m.destination, m.body);
  return url ? { url } : { reason: "contacto" };
}
