import "server-only";
import { requireStaff } from "./session";
import { todayIn } from "../domain/dates";

/** Search a wider UTC window, then select the gym's calendar day. */
function utcWindow(day: string) {
  const center = new Date(`${day}T12:00:00Z`).getTime();
  return {
    from: new Date(center - 36 * 60 * 60 * 1000).toISOString(),
    until: new Date(center + 36 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getDailyLedger(day: string, timeZone: string) {
  const { db } = await requireStaff();
  const { from, until } = utcWindow(day);
  const paymentSelection =
    "id,created_at,occurred_on,import_batch_id,staff(name),payment_entries(method,amount_cents),subscriptions!payment_batches_subscription_id_fkey(customer_id,activity_name,currency,starts_on,ends_on,customers!subscriptions_customer_id_fkey(name))";
  const livePaymentPage = (offset: number) =>
    db.from("payment_batches").select(paymentSelection)
      .is("occurred_on", null).gte("created_at", from).lt("created_at", until)
      .order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
  const importedPaymentPage = (offset: number) =>
    db.from("payment_batches").select(paymentSelection)
      .eq("occurred_on", day).order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
  const periodPage = (offset: number) =>
    db.from("subscription_balances")
      .select("id,created_at,customer_id,activity_name,total_cents,balance_cents,currency,starts_on,ends_on")
      .is("import_batch_id", null).gte("created_at", from).lt("created_at", until)
      .order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
  const customerPage = (offset: number) =>
    db.from("customers").select("id,name,created_at")
      .gte("created_at", from).lt("created_at", until)
      .order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
  const eventPage = (offset: number) =>
    db.from("customer_events")
      .select("id,event,created_at,customer_id,customers!customer_events_customer_id_fkey(name)")
      .gte("created_at", from).lt("created_at", until)
      .order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);

  async function allPages<T>(
    fetchPage: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ) {
    const items: T[] = [];
    for (;;) {
      const result = await fetchPage(items.length);
      if (result.error || !result.data)
        throw new Error("No pudimos cargar el historial diario.");
      items.push(...result.data);
      if (result.data.length < 1000) return items;
    }
  }

  const [live, imported, periods, customers, events] = await Promise.all([
    allPages(livePaymentPage),
    allPages(importedPaymentPage),
    allPages(periodPage),
    allPages(customerPage),
    allPages(eventPage),
  ]);
  const payments = [...live.filter((row) => todayIn(timeZone, new Date(row.created_at)) === day), ...imported]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const dailyPeriods = periods.filter((row) => row.created_at && todayIn(timeZone, new Date(row.created_at)) === day);
  const customerIds = [...new Set(dailyPeriods.map((row) => row.customer_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  for (let index = 0; index < customerIds.length; index += 100) {
    const { data, error } = await db.from("customers").select("id,name")
      .in("id", customerIds.slice(index, index + 100));
    if (error) throw new Error("No pudimos cargar los clientes del historial.");
    for (const customer of data) names.set(customer.id, customer.name);
  }
  return {
    payments,
    periods: dailyPeriods,
    names,
    customers: customers.filter((row) => todayIn(timeZone, new Date(row.created_at)) === day),
    events: events.filter((row) => todayIn(timeZone, new Date(row.created_at)) === day),
  };
}
