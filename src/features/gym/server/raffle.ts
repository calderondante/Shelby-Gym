import "server-only";
import { requireStaff } from "./session";
import { todayIn } from "../domain/dates";
import { raffleExclusion } from "../domain/raffle";

export async function getBirthdayRaffle(month: string, timeZone: string, search: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const { db } = await requireStaff();
  const drawResult = await db.from("raffle_draws").select("draw_on")
    .eq("birth_year", year).eq("birth_month", monthNumber).maybeSingle();
  if (drawResult.error) throw new Error("No pudimos cargar el sorteo.");
  const today = todayIn(timeZone);
  const cutoff = drawResult.data?.draw_on ?? today;
  const customers: { id: string; name: string; birth_month: number | null; created_at: string }[] = [];
  for (;;) {
    const result = await db.from("customers").select("id,name,birth_month,created_at")
      .eq("birth_month", monthNumber).order("name").order("id")
      .range(customers.length, customers.length + 999);
    if (result.error) throw new Error("No pudimos cargar los cumpleaños.");
    customers.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const matching = customers.filter((customer) => customer.name.toLocaleLowerCase("es-AR").includes(search.toLocaleLowerCase("es-AR")));
  const periods = new Map<string, string>();
  const inactive = new Map<string, boolean>();
  async function allPages<T>(fetchPage: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
    const items: T[] = [];
    for (;;) {
      const result = await fetchPage(items.length);
      if (result.error || !result.data) throw new Error("No pudimos verificar quién participa del sorteo.");
      items.push(...result.data);
      if (result.data.length < 1000) return items;
    }
  }
  for (let index = 0; index < matching.length; index += 100) {
    const ids = matching.slice(index, index + 100).map((customer) => customer.id);
    if (!ids.length) continue;
    const [subscriptions, events] = await Promise.all([
      allPages((offset) => db.from("subscriptions").select("customer_id,starts_on,ends_on").in("customer_id", ids).lte("starts_on", cutoff).order("ends_on", { ascending: false }).order("id").range(offset, offset + 999)),
      allPages((offset) => db.from("customer_events").select("customer_id,event,created_at").in("customer_id", ids).order("created_at", { ascending: true }).order("id").range(offset, offset + 999)),
    ]);
    for (const period of subscriptions) {
      if (!periods.has(period.customer_id)) periods.set(period.customer_id, period.ends_on);
    }
    for (const event of events) {
      if (todayIn(timeZone, new Date(event.created_at)) <= cutoff)
        inactive.set(event.customer_id, event.event !== "reactivated");
    }
  }
  const rows = matching.map((customer) => ({
    ...customer,
    reason: raffleExclusion({
      registeredOn: todayIn(timeZone, new Date(customer.created_at)),
      cutoff,
      latestEnd: periods.get(customer.id),
      inactive: inactive.get(customer.id) ?? false,
    }),
  }));
  return { cutoff, drawOn: drawResult.data?.draw_on ?? null, eligible: rows.filter((row) => !row.reason), excluded: rows.filter((row) => row.reason) };
}
