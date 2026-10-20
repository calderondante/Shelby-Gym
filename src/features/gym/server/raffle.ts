import "server-only";
import { requireStaff } from "./session";
import { todayIn } from "../domain/dates";
import { birthdayAccountStatus, raffleExclusion } from "../domain/raffle";

export async function getBirthdayRaffle(
  month: string,
  timeZone: string,
  search: string,
) {
  const [year, monthNumber] = month.split("-").map(Number);
  const { db } = await requireStaff();
  const drawResult = await db
    .from("raffle_draws")
    .select("draw_on,cutoff_at,snapshot_complete")
    .eq("birth_year", year)
    .eq("birth_month", monthNumber)
    .maybeSingle();
  if (drawResult.error) throw new Error("No pudimos cargar el sorteo.");
  const snapshotEntries = drawResult.data?.snapshot_complete
    ? await allPages((n) =>
        db
          .from("raffle_entries")
          .select("customer_id,customer_name,exclusion_reason,latest_end")
          .eq("birth_year", year)
          .eq("birth_month", monthNumber)
          .order("customer_id")
          .range(n, n + 999),
      )
    : [];
  const frozen = new Map(
    snapshotEntries.map((entry) => [entry.customer_id, entry]),
  );
  const today = todayIn(timeZone);
  const cutoff = drawResult.data?.draw_on ?? today;
  const customers: {
    id: string;
    name: string;
    birth_month: number | null;
    created_at: string;
    status: string;
  }[] = [];
  for (;;) {
    const result = await db
      .from("customers")
      .select("id,name,birth_month,created_at,status")
      .eq("birth_month", monthNumber)
      .order("name")
      .order("id")
      .range(customers.length, customers.length + 999);
    if (result.error) throw new Error("No pudimos cargar los cumpleaños.");
    customers.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const loadedIds = new Set(customers.map((c) => c.id));
  const extraIds = snapshotEntries
    .map((e) => e.customer_id)
    .filter((id) => !loadedIds.has(id));
  for (let n = 0; n < extraIds.length; n += 100) {
    const result = await db
      .from("customers")
      .select("id,name,birth_month,created_at,status")
      .in("id", extraIds.slice(n, n + 100));
    if (result.error)
      throw new Error("No pudimos cargar la lista conservada del sorteo.");
    customers.push(...result.data);
  }
  for (const customer of customers)
    customer.name = frozen.get(customer.id)?.customer_name ?? customer.name;
  const matching = customers.filter((customer) =>
    customer.name
      .toLocaleLowerCase("es-AR")
      .includes(search.toLocaleLowerCase("es-AR")),
  );
  const periodsAtDraw = new Map<string, string>();
  const currentEnds = new Map<string, string>();
  const currentBalances = new Map<string, number>();
  const inactive = new Map<string, boolean>();
  async function allPages<T>(
    fetchPage: (
      offset: number,
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ) {
    const items: T[] = [];
    for (;;) {
      const result = await fetchPage(items.length);
      if (result.error || !result.data)
        throw new Error("No pudimos verificar quién participa del sorteo.");
      items.push(...result.data);
      if (result.data.length < 1000) return items;
    }
  }
  for (let index = 0; index < matching.length; index += 100) {
    const ids = matching
      .slice(index, index + 100)
      .map((customer) => customer.id);
    if (!ids.length) continue;
    const [subscriptions, events] = await Promise.all([
      allPages((offset) =>
        db
          .from("subscription_balances")
          .select("id,customer_id,starts_on,ends_on,balance_cents")
          .in("customer_id", ids)
          .order("id")
          .range(offset, offset + 999),
      ),
      allPages((offset) =>
        db
          .from("customer_events")
          .select("customer_id,event,created_at")
          .in("customer_id", ids)
          .order("created_at", { ascending: true })
          .order("id")
          .range(offset, offset + 999),
      ),
    ]);
    for (const period of subscriptions) {
      if (!period.customer_id || !period.starts_on || !period.ends_on) continue;
      if (
        period.starts_on <= cutoff &&
        (!periodsAtDraw.has(period.customer_id) ||
          period.ends_on > periodsAtDraw.get(period.customer_id)!)
      )
        periodsAtDraw.set(period.customer_id, period.ends_on);
      if (
        period.starts_on <= today &&
        (!currentEnds.has(period.customer_id) ||
          period.ends_on > currentEnds.get(period.customer_id)!)
      )
        currentEnds.set(period.customer_id, period.ends_on);
      currentBalances.set(
        period.customer_id,
        (currentBalances.get(period.customer_id) ?? 0) +
          (period.balance_cents ?? 0),
      );
    }
    for (const event of events) {
      if (todayIn(timeZone, new Date(event.created_at)) <= cutoff)
        inactive.set(event.customer_id, event.event !== "reactivated");
    }
  }
  const rows = matching.map((customer) => {
    const balanceCents = currentBalances.get(customer.id) ?? 0;
    return {
      ...customer,
      balanceCents,
      accountStatus: birthdayAccountStatus({
        customerStatus: customer.status,
        latestEnd: currentEnds.get(customer.id),
        balanceCents,
        today,
      }),
      reason: drawResult.data?.snapshot_complete
        ? frozen.has(customer.id)
          ? frozen.get(customer.id)!.exclusion_reason
          : customer.created_at > drawResult.data.cutoff_at!
            ? "Alta posterior al sorteo"
            : "No figuraba en el cierre"
        : raffleExclusion({
            registeredOn: todayIn(timeZone, new Date(customer.created_at)),
            cutoff,
            latestEnd: periodsAtDraw.get(customer.id),
            inactive: inactive.get(customer.id) ?? false,
          }),
    };
  });
  return {
    snapshotComplete: drawResult.data?.snapshot_complete ?? false,
    cutoffAt: drawResult.data?.cutoff_at ?? null,
    cutoff,
    drawOn: drawResult.data?.draw_on ?? null,
    eligible: rows.filter((row) => !row.reason),
    excluded: rows.filter((row) => row.reason),
  };
}
