"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner, requireSettings } from "./session";
import { customerSchema } from "../validation/contracts";
import { paperRecordSchema } from "../domain/paper-registration";
import { todayIn } from "../domain/dates";
import type { ActionResult } from "./actions";
const text = (form: FormData, name: string) => String(form.get(name) ?? "");
export async function paperRegistrationAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const [{ db }, settings] = await Promise.all([
    requireOwner(),
    requireSettings(),
  ]);
  const raw = text(form, "historicalPayments");
  if (raw.length > 20000)
    return { error: "El detalle de pagos es demasiado grande." };
  let payments: unknown;
  try {
    payments = JSON.parse(raw || "[]");
  } catch {
    return { error: "Revisá el detalle de pagos anteriores." };
  }
  const profile = customerSchema.safeParse({
    ...Object.fromEntries(
      ["name", "phone", "email", "notes", "instagram", "birthMonth"].map(
        (key) => [key, text(form, key)],
      ),
    ),
    marketingOptIn: form.get("marketingOptIn") === "on",
    instagramMarketingOptIn: form.get("instagramMarketingOptIn") === "on",
  });
  const record = paperRecordSchema(todayIn(settings.time_zone)).safeParse({
    ...Object.fromEntries(
      [
        "requestId",
        "activityId",
        "activityRevision",
        "unit",
        "startsOn",
        "endsOn",
        "total",
        "paid",
        "usedClasses",
      ].map((key) => [key, text(form, key)]),
    ),
    payments,
  });
  if (!profile.success || !record.success) {
    const issues = [
      ...(!profile.success ? profile.error.issues : []),
      ...(!record.success ? record.error.issues : []),
    ];
    return {
      error: issues[0]?.message ?? "Revisá los datos del papel.",
      fieldErrors: Object.fromEntries(
        issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }
  const value = record.data;
  const result = await db.rpc("register_paper_customer", {
    p_request: value.requestId,
    p_profile: profile.data,
    p_record: {
      activityId: value.activityId,
      activityRevision: value.activityRevision,
      currency: settings.currency,
      startsOn: value.startsOn,
      endsOn: value.endsOn || null,
      totalCents: value.total,
      paidCents: value.paid,
      usedClasses: value.usedClasses,
      payments: value.payments,
    },
  });
  if (result.error) {
    const messages: Record<string, string> = {
      FORBIDDEN:
        "Solo el dueño puede incorporar registros anteriores del papel.",
      PRICE_CHANGED:
        "La actividad cambió mientras completabas el registro. Recargá para revisar su duración; el importe histórico lo indicás vos.",
      ACTIVITY_UNAVAILABLE: "La actividad elegida ya no está disponible.",
      MONTH_CLOSED:
        "Ese inicio o pago pertenece a un mes cerrado. No modificamos sus cifras; revisá el registro antes de incorporarlo.",
      REQUEST_CONFLICT:
        "Esta operación ya se registró con otros datos. Revisá el perfil antes de volver a cargarla.",
      HISTORICAL_PAYMENTS_EXCEED_PAID:
        "El detalle de pagos supera el total ya abonado.",
      INVALID_PAYMENT:
        "Revisá fechas, medios e importes de los pagos anteriores.",
      INVALID_PAPER_RECORD:
        "Revisá las fechas, el importe pactado, lo abonado y las clases ya usadas.",
    };
    return {
      error:
        messages[result.error.message] ??
        "No pudimos confirmar el guardado. Conservamos el formulario: revisá la conexión y el listado antes de repetir la carga.",
    };
  }
  revalidatePath("/clientes");
  revalidatePath("/historial");
  redirect(`/clientes/${result.data}?guardado=papel`);
}
