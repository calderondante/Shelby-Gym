import "server-only";
import { requireStaff } from "./session";
import { todayIn } from "../domain/dates";

/** Search a wider UTC window, then select the gym's calendar dates. */
function utcWindow(day: string) {
  const center = new Date(`${day}T12:00:00Z`).getTime();
  return {
    from: new Date(center - 36 * 60 * 60 * 1000).toISOString(),
    until: new Date(center + 36 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getMonthlyLedger(
  month: string,
  timeZone: string,
  currency: string,
) {
  const { db } = await requireStaff();
  const [year, number] = month.split("-").map(Number);
  const firstDay = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, number, 0))
    .toISOString()
    .slice(0, 10);
  const nextMonth = new Date(Date.UTC(year, number, 1))
    .toISOString()
    .slice(0, 10);
  const { from } = utcWindow(firstDay);
  const { until } = utcWindow(lastDay);
  const inMonth = (timestamp: string) =>
    todayIn(timeZone, new Date(timestamp)).startsWith(month);
  const paymentSelection =
    "id,created_at,occurred_on,import_batch_id,payment_entries(method,amount_cents),subscriptions!payment_batches_subscription_id_fkey(customer_id,activity_name,currency,starts_on,ends_on,duration_unit,customers!subscriptions_customer_id_fkey(name))";
  const livePaymentPage = (offset: number) =>
    db
      .from("payment_batches")
      .select(paymentSelection)
      .is("occurred_on", null)
      .gte("created_at", from)
      .lt("created_at", until)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
  const importedPaymentPage = (offset: number) =>
    db
      .from("payment_batches")
      .select(paymentSelection)
      .gte("occurred_on", firstDay)
      .lt("occurred_on", nextMonth)
      .order("occurred_on", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
  const periodPage = (offset: number) =>
    db
      .from("subscription_balances")
      .select(
        "id,created_at,customer_id,activity_name,total_cents,balance_cents,currency,starts_on,ends_on,duration_unit",
      )
      .is("import_batch_id", null)
      .gte("created_at", from)
      .lt("created_at", until)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
  const customerPage = (offset: number) =>
    db
      .from("customers")
      .select("id,name,created_at")
      .gte("created_at", from)
      .lt("created_at", until)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
  const eventPage = (offset: number) =>
    db
      .from("customer_events")
      .select(
        "id,event,created_at,customer_id,customers!customer_events_customer_id_fkey(name)",
      )
      .gte("created_at", from)
      .lt("created_at", until)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
  const sessionPage = (offset: number) =>
    db
      .from("session_events")
      .select(
        "id,delta,reason,occurred_on,subscriptions(customer_id,activity_name,customers(name))",
      )
      .gte("occurred_on", firstDay)
      .lt("occurred_on", nextMonth)
      .order("occurred_on")
      .order("id")
      .range(offset, offset + 999);
  const balancePage = (offset: number) =>
    db
      .from("subscription_balances")
      .select(
        "id,customer_id,balance_cents,starts_on,duration_unit,activity_name,customers(name)",
      )
      .eq("currency", currency)
      .order("id")
      .range(offset, offset + 999);

  async function allPages<T>(
    fetchPage: (
      offset: number,
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ) {
    const items: T[] = [];
    for (;;) {
      const result = await fetchPage(items.length);
      if (result.error || !result.data)
        throw new Error("No pudimos cargar el historial mensual.");
      items.push(...result.data);
      if (result.data.length < 1000) return items;
    }
  }

  const [live, imported, periods, customers, events, balances, sessions] =
    await Promise.all([
      allPages(livePaymentPage),
      allPages(importedPaymentPage),
      allPages(periodPage),
      allPages(customerPage),
      allPages(eventPage),
      allPages(balancePage),
      allPages(sessionPage),
    ]);
  const payments = [
    ...live.filter((row) => inMonth(row.created_at)),
    ...imported,
  ].sort(
    (a, b) =>
      (b.occurred_on ?? b.created_at).localeCompare(
        a.occurred_on ?? a.created_at,
      ) || b.id.localeCompare(a.id),
  );
  const monthlyPeriods = periods.filter(
    (row) => row.created_at && inMonth(row.created_at),
  );
  const customerIds = [
    ...new Set(
      monthlyPeriods
        .map((row) => row.customer_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const names = new Map<string, string>();
  for (let index = 0; index < customerIds.length; index += 100) {
    const { data, error } = await db
      .from("customers")
      .select("id,name")
      .in("id", customerIds.slice(index, index + 100));
    if (error) throw new Error("No pudimos cargar los clientes del historial.");
    for (const customer of data) names.set(customer.id, customer.name);
  }
  return {
    payments,
    balances,
    sessions,
    periods: monthlyPeriods,
    names,
    customers: customers.filter((row) => inMonth(row.created_at)),
    events: events.filter((row) => inMonth(row.created_at)),
    pendingCents: balances.reduce(
      (sum, row) => sum + (row.balance_cents ?? 0),
      0,
    ),
    monthlyPendingCents: balances.reduce(
      (sum, row) =>
        sum + (row.starts_on?.startsWith(month) ? (row.balance_cents ?? 0) : 0),
      0,
    ),
  };
}
