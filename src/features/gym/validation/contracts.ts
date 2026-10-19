import { z } from "zod";
import { parseMoney } from "../domain/money";
export const uuid = z.uuid();
export const amount = z
  .string()
  .transform(parseMoney)
  .refine(
    (value): value is number => value !== null,
    "Ingresá un importe válido con hasta dos decimales.",
  );
export const paymentSchema = z
  .object({
    cash: amount,
    transfer: amount,
    mercado_pago: amount,
  })
  .refine(
    (v) => v.cash + v.transfer + v.mercado_pago > 0,
    "Registrá al menos un importe mayor a cero.",
  );
export const customerSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre completo.").max(120),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.email()]).default(""),
  notes: z.string().trim().max(500),
  birthMonth: z.coerce.number().int().min(0).max(12),
});
export const enrollmentSchema = z.object({
  requestId: uuid,
  activityId: uuid,
  expectedRevision: z.coerce.number().int().positive(),
  expectedStart: z.iso.date(),
  expectedPrice: z.coerce.number().int().positive().max(100_000_000),
  payments: paymentSchema,
});
export const activitySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500),
    price: amount.refine((v) => v > 0, "El precio debe ser mayor a cero."),
    offerPrice: z.union([z.literal(""), amount]),
    offerLabel: z.string().trim().max(100),
    duration: z.coerce.number().int().min(1).max(365),
    unit: z.enum(["months", "days"]),
    active: z.boolean(),
  })
  .refine(
    (v) => v.unit !== "months" || v.duration <= 24,
    "La duración máxima es de 24 meses.",
  )
  .refine(
    (v) =>
      v.offerPrice === "" ||
      (v.offerPrice > 0 && v.offerPrice < v.price && v.offerLabel.length > 0),
    "La oferta necesita un nombre y un precio menor al habitual.",
  );
export type PaymentAmounts = z.infer<typeof paymentSchema>;
export const paymentMethods = {
  transfer: "Transferencia",
  mercado_pago: "Mercado Pago",
  cash: "Efectivo",
} as const;
export function paymentLines(payments: PaymentAmounts) {
  return Object.entries(payments)
    .filter(([, value]) => value > 0)
    .map(([method, amount]) => ({ method, amount }));
}
