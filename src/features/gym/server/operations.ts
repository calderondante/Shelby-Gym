import "server-only";
import { requireOwner, requireStaff, requireSettings } from "./session";
import { todayIn } from "../domain/dates";
import {
  recoveryEligible,
  closingSchema,
  entriesSchema,
} from "../domain/operations";
import { shiftMonth } from "../domain/ledger-calendar";

export async function allPages<T>(
  fetchPage: (
    offset: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const result = await fetchPage(rows.length);
    if (result.error || !result.data)
      throw new Error(
        "No pudimos cargar todos los movimientos. Intentá de nuevo.",
      );
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
}
export async function getExpenseData(month: string) {
  const { db } = await requireStaff();
  const [expenses, templates, payments, pending, close] = await Promise.all([
    allPages((n) =>
      db
        .from("expense_balances")
        .select("*")
        .gte("due_on", `${month}-01`)
        .lt("due_on", `${shiftMonth(month, 1)}-01`)
        .order("due_on")
        .order("id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("expense_templates")
        .select("*")
        .order("title")
        .order("id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("expense_payments")
        .select("*,expenses(title)")
        .gte("occurred_on", `${month}-01`)
        .lt("occurred_on", `${shiftMonth(month, 1)}-01`)
        .order("occurred_on")
        .order("id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("expense_balances")
        .select("id,balance_cents")
        .gt("balance_cents", 0)
        .order("id")
        .range(n, n + 999),
    ),
    db
      .from("monthly_closings")
      .select("*")
      .eq("month", `${month}-01`)
      .maybeSingle(),
  ]);
  const reversed = new Set<string>();
  for (let n = 0; n < payments.length; n += 100) {
    const rows = await allPages((offset) =>
      db
        .from("expense_payments")
        .select("id,reversal_of")
        .in(
          "reversal_of",
          payments.slice(n, n + 100).map((p) => p.id),
        )
        .order("id")
        .range(offset, offset + 999),
    );
    for (const row of rows) if (row.reversal_of) reversed.add(row.reversal_of);
  }
  if (close.error) throw new Error("No pudimos cargar el cierre mensual.");
  return {
    expenses,
    templates,
    payments: payments.map((p) => ({
      ...p,
      reversed: reversed.has(p.id),
      lines: entriesSchema.parse(p.entries),
    })),
    spent: payments.reduce(
      (sum, p) => sum + (p.reversal_of ? -p.amount_cents : p.amount_cents),
      0,
    ),
    pending: pending.reduce((sum, p) => sum + (p.balance_cents ?? 0), 0),
    closing: close.data
      ? { ...close.data, totals: closingSchema.parse(close.data.snapshot) }
      : null,
  };
}
export async function getSessionEvents(customerId: string) {
  const { db } = await requireStaff();
  return allPages((n) =>
    db
      .from("session_events")
      .select("*,subscriptions!inner(customer_id,activity_name),staff(name)")
      .eq("subscriptions.customer_id", customerId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(n, n + 999),
  );
}
export async function getCampaignData() {
  const [{ db }, settings] = await Promise.all([
    requireOwner(),
    requireSettings(),
  ]);
  const [customers, campaigns] = await Promise.all([
    allPages((n) =>
      db
        .from("customer_overview")
        .select(
          "id,name,phone,instagram,marketing_opt_in,last_end,balance_cents,status",
        )
        .neq("status", "retired")
        .order("name")
        .order("id")
        .range(n, n + 999),
    ),
    allPages((n) =>
      db
        .from("campaigns")
        .select("*,campaign_recipients(customer_id)")
        .order("created_at", { ascending: false })
        .order("id")
        .range(n, n + 999),
    ),
  ]);
  return {
    candidates: customers.filter((c) =>
      recoveryEligible(c.last_end, todayIn(settings.time_zone)),
    ),
    campaigns,
  };
}
