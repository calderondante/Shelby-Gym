import "server-only";
import { getMonthlyLedger } from "./monthly-ledger";
import { getExpenseData } from "./operations";
import type { Closing } from "../domain/operations";
import { paymentDay } from "../domain/ledger-calendar";
export async function getReport(
  month: string,
  timeZone: string,
  currency: string,
  frozen: boolean,
) {
  const [ledger, costs] = await Promise.all([
    getMonthlyLedger(month, timeZone, currency),
    getExpenseData(month),
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
    totals: frozen && costs.closing ? costs.closing.totals : current,
    closing: costs.closing,
    frozen: frozen && !!costs.closing,
  };
}
