import { z } from "zod";
import { amount, uuid } from "../validation/contracts";
export const paperPaymentSchema = z
  .object({
    date: z.iso.date(),
    entries: z
      .array(
        z.object({
          method: z.enum(["cash", "transfer", "mercado_pago"]),
          amount: z.number().int().positive().max(100_000_000),
        }),
      )
      .min(1)
      .max(3),
  })
  .superRefine((payment, ctx) => {
    if (
      new Set(payment.entries.map((e) => e.method)).size !==
      payment.entries.length
    )
      ctx.addIssue({
        code: "custom",
        message: "No repitas el mismo medio dentro de un pago.",
      });
  });
export function paperRecordSchema(today: string) {
  const pastDate = z.iso
    .date()
    .refine(
      (v) => v >= "1900-01-01" && v <= today,
      "La fecha debe ser de hoy o anterior.",
    );
  return z
    .object({
      requestId: uuid,
      activityId: uuid,
      activityRevision: z.coerce.number().int().positive(),
      unit: z.enum(["months", "days", "sessions"]),
      startsOn: pastDate,
      endsOn: z.union([z.literal(""), z.iso.date()]),
      total: amount.refine(
        (v) => v > 0,
        "Ingresá el importe pactado en el papel.",
      ),
      paid: amount,
      usedClasses: z.coerce.number().int().min(0).max(365),
      payments: z
        .array(paperPaymentSchema.safeExtend({ date: pastDate }))
        .max(20),
    })
    .superRefine((v, ctx) => {
      if (v.paid > v.total)
        ctx.addIssue({
          code: "custom",
          message: "Lo abonado no puede superar el importe pactado.",
          path: ["paid"],
        });
      if (
        v.unit !== "sessions" &&
        (!v.endsOn || v.endsOn <= v.startsOn || v.endsOn > "2200-12-31")
      )
        ctx.addIssue({
          code: "custom",
          message: "El vencimiento debe ser posterior al inicio.",
          path: ["endsOn"],
        });
      if (v.unit === "sessions" && v.endsOn !== "")
        ctx.addIssue({
          code: "custom",
          message: "Los packs de clases no tienen vencimiento por fecha.",
          path: ["endsOn"],
        });
      if (v.unit !== "sessions" && v.usedClasses !== 0)
        ctx.addIssue({
          code: "custom",
          message: "Las clases usadas solo corresponden a un pack.",
        });
      if (
        v.payments.reduce(
          (sum, p) => sum + p.entries.reduce((s, e) => s + e.amount, 0),
          0,
        ) > v.paid
      )
        ctx.addIssue({
          code: "custom",
          message: "El detalle de pagos supera el total ya abonado.",
          path: ["payments"],
        });
    });
}
