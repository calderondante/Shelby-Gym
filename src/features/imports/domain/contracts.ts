import { z } from "zod";
const id = z.string().trim().min(1).max(100);
const cents = z.number().int().min(0).max(100_000_000);
const date = z.iso.date().refine((v) => v >= "1900-01-01" && v <= "2200-12-31");
export const importedPayment = z.object({
  external_id: id,
  date,
  entries: z
    .array(
      z.object({
        method: z.enum(["cash", "transfer", "mercado_pago"]),
        amount: cents.refine((v) => v > 0),
      }),
    )
    .min(1)
    .max(3),
});
export const importedPeriod = z
  .object({
    row: z.number().int().min(2),
    external_id: id,
    activity_id: z.uuid(),
    starts_on: date,
    ends_on: date,
    total_cents: cents.refine((v) => v > 0),
    balance_cents: cents,
    payments: z.array(importedPayment).max(1000),
  })
  .refine((v) => v.ends_on > v.starts_on && v.balance_cents <= v.total_cents);
export const importedClient = z
  .object({
    row: z.number().int().min(2),
    external_id: id,
    name: z.string().trim().min(2).max(120),
    phone: z.string().max(40),
    email: z.union([z.literal(""), z.email().max(254)]),
    age_years: z.number().int().min(0).max(120).nullable(),
    age_as_of: date.nullable(),
    periods: z.array(importedPeriod).max(500),
  })
  .refine((v) => (v.age_years === null) === (v.age_as_of === null));
export const importRequest = z
  .object({
    requestId: z.uuid(),
    source: z.string().trim().min(1).max(80),
    currency: z.string().regex(/^[A-Z]{3}$/),
    clients: z.array(importedClient).min(1).max(500),
  })
  .refine((v) => v.clients.reduce((n, c) => n + c.periods.length, 0) <= 500)
  .refine(
    (v) =>
      v.clients.reduce(
        (n, c) => n + c.periods.reduce((a, p) => a + p.payments.length, 0),
        0,
      ) <= 1000,
  );
export const importReport = z.object({
  created: z.number(),
  skipped: z.number(),
  committed: z.boolean(),
  periods: z.number(),
  payments: z.number(),
  issues: z.array(z.object({ row: z.number(), message: z.string() })),
});
export type ImportClient = z.infer<typeof importedClient>;
export type ImportReport = z.infer<typeof importReport>;
export type ImportPayload = z.infer<typeof importRequest>;
export type Cell = string | number | boolean | null;
export type Sheet = { sheet: string; data: Cell[][] };
export const columns = [
  ["external_id", "ID de cliente"],
  ["name", "Nombre y apellido"],
  ["age_years", "Edad"],
  ["phone", "Teléfono"],
  ["email", "Correo"],
  ["period_id", "ID de cuota"],
  ["activity", "Actividad"],
  ["starts_on", "Inicio"],
  ["ends_on", "Vencimiento"],
  ["total", "Cuota histórica"],
  ["balance", "Saldo pendiente"],
  ["payment_id", "ID de pago"],
  ["payment_date", "Fecha del pago"],
  ["method", "Medio de pago"],
  ["amount", "Importe del pago"],
] as const;
export type Column = (typeof columns)[number][0];
export type Mapping = Record<Column, number>;
export const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export function guessMapping(headers: Cell[]): Mapping {
  const aliases: Partial<Record<Column, string[]>> = {
    external_id: ["id", "socio", "id cliente"],
    name: ["nombre", "cliente", "nombre completo"],
    phone: ["celular", "telefono"],
    email: ["email", "mail"],
    total: ["cuota", "precio", "monto"],
    balance: ["saldo", "deuda"],
    period_id: ["id periodo"],
    starts_on: ["fecha inicio"],
    ends_on: ["fecha vencimiento"],
  };
  return Object.fromEntries(
    columns.map(([key, label]) => [
      key,
      headers.findIndex((h) =>
        [normalize(label), key, ...(aliases[key] ?? [])].includes(
          normalize(String(h ?? "")),
        ),
      ),
    ]),
  ) as Mapping;
}
