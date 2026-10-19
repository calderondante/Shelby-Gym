import { todayIn } from "./dates";

export function validMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2100;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function daysOfMonth(month: string): string[] {
  const [year, number] = month.split("-").map(Number);
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

export function paymentDay(payment: { occurred_on: string | null; created_at: string }, timeZone: string) {
  return payment.occurred_on ?? todayIn(timeZone, new Date(payment.created_at));
}

export function sumMethods(
  batches: readonly { payment_entries: readonly { method: string; amount_cents: number }[] }[],
) {
  const totals = { transfer: 0, mercado_pago: 0, cash: 0 };
  for (const batch of batches)
    for (const entry of batch.payment_entries)
      if (entry.method in totals)
        totals[entry.method as keyof typeof totals] += entry.amount_cents;
  return totals;
}
