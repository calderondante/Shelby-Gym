import { z } from "zod";
import { endDate } from "./dates";

export const entriesSchema = z.array(
  z.object({
    method: z.enum(["cash", "transfer", "mercado_pago"]),
    amount: z.number().int().positive(),
  }),
);
export const closingSchema = z.object({
  month: z.string(),
  received: z.number(),
  spent: z.number(),
  pendingTotal: z.number(),
  pendingMonthly: z.number(),
  pendingMemberships: z.number(),
  pendingClasses: z.number(),
  pendingExpenses: z.number().default(0),
  payments: z.array(
    z.object({
      day: z.string(),
      name: z.string(),
      activity_name: z.string(),
      method: z.string(),
      amount_cents: z.number(),
    }),
  ),
  expenses: z.array(
    z.object({
      occurred_on: z.string(),
      title: z.string(),
      amount_cents: z.number(),
      reversal_of: z.string().nullable(),
      entries: entriesSchema,
    }),
  ),
  debts: z.array(
    z.object({
      name: z.string(),
      activity_name: z.string(),
      starts_on: z.string(),
      balance_cents: z.number(),
    }),
  ),
});
export type Closing = z.infer<typeof closingSchema>;
export function recoveryEligible(lastEnd: string | null, today: string) {
  return !!lastEnd && endDate(lastEnd, 2, "months") <= today;
}
export function csvCell(value: string | number) {
  const plain =
    typeof value === "number" ? String(value).replace(".", ",") : value;
  const safe =
    /^[\s]*[=+\-@]/.test(plain) && typeof value === "string"
      ? `'${plain}`
      : plain;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvRows(rows: (string | number)[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
