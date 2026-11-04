import "server-only";
import { getMonthlyLedger } from "./monthly-ledger";
import { getExpenseData, getMonthlyClosing } from "./operations";
import type { Closing } from "../domain/operations";
import { todayIn } from "../domain/dates";
import { paymentDay } from "../domain/ledger-calendar";
export async function getReport(
  month: string,
  timeZone: string,
  currency: string,
  frozen: boolean,
) {
  // Closed reports are immutable snapshots. Do not reconstruct today's ledger
  // just to return yesterday's snapshot. Only past months can have a closing.
  const closingPromise = getMonthlyClosing(month);
  if (frozen && month < todayIn(timeZone).slice(0, 7)) {
    const closing = await closingPromise;
    if (closing) return { totals: closing.totals, closing, frozen: true };
  }
  const [ledger, costs, closing] = await Promise.all([
    getMonthlyLedger(month, timeZone, currency, { reportOnly: true }),
    getExpenseData(month, { detail: false }),
    closingPromise,
  ]);
  const current: Closing = {
    month,
    pendingExpenses: costs.pending,
    received: ledger.payments.reduce(
      (sum, p) =>
        sum + p.payment_entries.reduce((s, e) => s + e.amount_cents, 0),
      0,
    ),
    spent: costs.spent,
    pendingTotal: ledger.pendingCents,
    pendingMonthly: ledger.monthlyPendingCents,
    pendingMemberships: ledger.balances
      .filter(
        (p) => p.starts_on?.startsWith(month) && p.duration_unit !== "sessions",
      )
      .reduce((sum, p) => sum + (p.balance_cents ?? 0), 0),
    pendingClasses: ledger.balances
      .filter(
        (p) => p.starts_on?.startsWith(month) && p.duration_unit === "sessions",
      )
      .reduce((sum, p) => sum + (p.balance_cents ?? 0), 0),
    payments: ledger.payments.flatMap((p) =>
      p.payment_entries.map((e) => ({
        day: paymentDay(p, timeZone),
        name: p.subscriptions.customers?.name ?? "Cliente",
        activity_name: p.subscriptions.activity_name,
        method: e.method,
        amount_cents: e.amount_cents,
      })),
    ),
    expenses: costs.payments.map((p) => ({
      occurred_on: p.occurred_on,
      title: p.expenses?.title ?? "Gasto",
      amount_cents: p.amount_cents,
      reversal_of: p.reversal_of,
      entries: p.lines,
    })),
    debts: ledger.balances
      .filter((p) => p.balance_cents! > 0)
      .map((p) => ({
        name: p.customers?.name ?? "Cliente",
        activity_name: p.activity_name!,
        starts_on: p.starts_on!,
        balance_cents: p.balance_cents!,
      })),
  };
  return {
    totals: frozen && closing ? closing.totals : current,
    closing,
    frozen: frozen && !!closing,
  };
}
