import "server-only";
import { notFound } from "next/navigation";
import { requireSettings, requireStaff } from "./session";
import { todayIn } from "../domain/dates";
import { uuid } from "../validation/contracts";
export async function getActivities(activeOnly = false) {
  const { db } = await requireStaff();
  let query = db
    .from("activities")
    .select("*")
    .order("active", { ascending: false })
    .order("name")
    .limit(200);
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error("No pudimos cargar las actividades.");
  return data;
}
export async function getCustomers(
  search: string,
  filter: string,
  page: number,
) {
  const [{ db }, settings] = await Promise.all([requireStaff(), requireSettings()]);
  let query = db
    .from("customer_overview")
    .select("id,name,phone,activity_names,balance_cents,last_end,has_active,status", {
      count: "exact",
    });
  query = query.eq("status", filter === "bajas" ? "inactive" : filter === "retirados" ? "retired" : "active");
  // Do not interpolate user input into PostgREST filter expressions.
  if (search.trim())
    query = query.ilike(
      "name",
      `%${search
        .trim()
        .replace(/[%_\\]/g, "")
        .slice(0, 100)}%`,
    );
  if (filter === "deuda") query = query.gt("balance_cents", 0);
  if (filter === "aldia") query = query.eq("balance_cents", 0).eq("has_active", true);
  if (filter === "vencidas") query = query.lte("last_end", todayIn(settings.time_zone));
  if (filter === "mas30") {
    const cutoff = new Date(`${todayIn(settings.time_zone)}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - 30);
    query = query.lte("last_end", cutoff.toISOString().slice(0, 10));
  }
  const { data, error, count } = await query
    .order("name")
    .order("id")
    .range((page - 1) * 30, page * 30 - 1);
  if (error) throw new Error("No pudimos cargar los clientes.");
  return { customers: data, count: count ?? 0 };
}
export async function getCustomer(id: string) {
  if (!uuid.safeParse(id).success) notFound();
  const { db } = await requireStaff();
  const [customer, subscriptions] = await Promise.all([
    db.from("customers").select("*").eq("id", id).maybeSingle(),
    db
      .from("subscription_balances")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (customer.error || subscriptions.error)
    throw new Error("No pudimos cargar el perfil.");
  if (!customer.data) notFound();
  return { customer: customer.data, subscriptions: subscriptions.data };
}
export async function getPayments(customerId: string) {
  const { db } = await requireStaff();
  const fetchPage = (offset: number) =>
    db
      .from("payment_batches")
      .select(
        "id,subscription_id,created_at,occurred_on,import_batch_id,staff(name),payment_entries(method,amount_cents),subscriptions!inner(customer_id)",
      )
      .eq("subscriptions.customer_id", customerId)
      .order("created_at", { ascending: true })
      .order("id")
      .range(offset, offset + 999);
  const first = await fetchPage(0);
  if (first.error) throw new Error("No pudimos cargar el historial de pagos.");
  const payments = first.data;
  let size = first.data.length;
  while (size === 1000) {
    const next = await fetchPage(payments.length);
    if (next.error)
      throw new Error("No pudimos cargar el historial completo de pagos.");
    payments.push(...next.data);
    size = next.data.length;
  }
  return payments;
}
export async function getCustomerEvents(customerId: string) {
  if (!uuid.safeParse(customerId).success) notFound();
  const { db } = await requireStaff();
  const { data, error } = await db.from("customer_events")
    .select("id,event,created_at,staff(name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("No pudimos cargar los movimientos del perfil.");
  return data;
}
