"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  activitySchema,
  customerSchema,
  enrollmentSchema,
  paymentLines,
  paymentSchema,
  uuid,
} from "../validation/contracts";
import { requireOwner, requireStaff } from "./session";
export type ActionResult = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};
function invalid(error: z.ZodError): ActionResult {
  return {
    error: "Revisá los datos indicados.",
    fieldErrors: Object.fromEntries(
      error.issues.map((i) => [i.path.join("."), i.message]),
    ),
  };
}
function failure(message: string): ActionResult {
  const messages: Record<string, string> = {
    OVERPAYMENT:
      "El importe supera el saldo actual. Actualizá la pantalla y revisá el pago.",
    DATE_CHANGED:
      "Cambió el día desde que abriste el formulario. Actualizá para revisar las fechas.",
    PRICE_CHANGED:
      "Las condiciones de la actividad cambiaron mientras completabas el alta. Actualizá la pantalla para revisar las nuevas condiciones.",
    ACTIVITY_UNAVAILABLE:
      "Esta actividad ya no está disponible. Elegí otra opción.",
    ALREADY_ACTIVE:
      "El cliente ya tiene esta actividad vigente. Podrás renovarla cuando venza.",
    STALE_ACTIVITY:
      "Otra persona modificó esta actividad. Actualizá antes de guardar.",
    STALE_CUSTOMER:
      "Otra persona modificó el perfil. Actualizá antes de guardar.",
    INVALID_STATUS: "El estado solicitado no es válido.",
    REQUEST_CONFLICT:
      "Esta operación ya fue registrada con otros datos. Actualizá la pantalla.",
    CURRENCY_LOCKED:
      "Ya hay cuotas registradas. La moneda no se puede cambiar desde aquí.",
    FORBIDDEN: "Tu cuenta no tiene permiso para realizar esta acción.",
  };
  return {
    error:
      messages[message] ??
      "No se pudo guardar. Tus datos siguen en el formulario; revisá la conexión e intentá de nuevo.",
  };
}
function text(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}
function payments(form: FormData) {
  return {
    cash: text(form, "cash") || "0",
    transfer: text(form, "transfer") || "0",
    mercado_pago: text(form, "mercado_pago") || "0",
  };
}
function customer(form: FormData) {
  return {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    notes: text(form, "notes"),
  };
}
export async function enrollAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireStaff();
  const parsed = enrollmentSchema.safeParse({
    requestId: text(form, "requestId"),
    activityId: text(form, "activityId"),
    expectedPrice: text(form, "expectedPrice"),
    expectedRevision: text(form, "expectedRevision"),
    expectedStart: text(form, "expectedStart"),
    payments: payments(form),
  });
  if (!parsed.success) return invalid(parsed.error);
  const customerId = text(form, "customerId");
  const profile = customerSchema.safeParse(customer(form));
  if (customerId && !uuid.safeParse(customerId).success)
    return { error: "Cliente inválido." };
  if (!customerId && !profile.success) return invalid(profile.error);
  const { data, error } = await db.rpc("enroll_customer", {
    p_request: parsed.data.requestId,
    p_customer_id: customerId || null,
    p_customer: profile.success ? profile.data : {},
    p_activity: parsed.data.activityId,
    p_expected_price: parsed.data.expectedPrice,
    p_expected_revision: parsed.data.expectedRevision,
    p_expected_start: parsed.data.expectedStart,
    p_entries: paymentLines(parsed.data.payments),
  });
  if (error) return failure(error.message);
  revalidatePath("/clientes");
  redirect(`/clientes/${data}?guardado=alta`);
}
export async function paymentAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      subscriptionId: uuid,
      requestId: uuid,
      customerId: uuid,
      payments: paymentSchema,
    })
    .safeParse({
      subscriptionId: text(form, "subscriptionId"),
      requestId: text(form, "requestId"),
      customerId: text(form, "customerId"),
      payments: payments(form),
    });
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await db.rpc("record_payment", {
    p_subscription: parsed.data.subscriptionId,
    p_request: parsed.data.requestId,
    p_entries: paymentLines(parsed.data.payments),
  });
  if (error) return failure(error.message);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${parsed.data.customerId}`);
  redirect(`/clientes/${parsed.data.customerId}?guardado=pago`);
}
export async function activityAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const parsed = activitySchema.safeParse({
    name: text(form, "name"),
    description: text(form, "description"),
    price: text(form, "price"),
    offerPrice: text(form, "offerPrice"),
    offerLabel: text(form, "offerLabel"),
    duration: text(form, "duration"),
    unit: text(form, "unit"),
    active: form.get("active") === "on",
  });
  if (!parsed.success) return invalid(parsed.error);
  const id = text(form, "id");
  if (id && !uuid.safeParse(id).success)
    return { error: "Actividad inválida." };
  const value = parsed.data;
  const { error } = await db.rpc("save_activity", {
    p_id: id || null,
    p_revision: Number(text(form, "revision")) || 0,
    p_data: {
      name: value.name,
      description: value.description,
      price_cents: value.price,
      offer_price_cents: value.offerPrice === "" ? null : value.offerPrice,
      offer_label: value.offerLabel,
      duration_count: value.duration,
      duration_unit: value.unit,
      active: value.active,
    },
  });
  if (error) return failure(error.message);
  revalidatePath("/actividades");
  redirect("/actividades?guardado=1");
}
export async function updateCustomerAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireStaff();
  const parsed = customerSchema.safeParse(customer(form));
  if (!parsed.success) return invalid(parsed.error);
  const id = text(form, "id");
  if (!uuid.safeParse(id).success) return { error: "Cliente inválido." };
  const { error } = await db.rpc("update_customer", {
    p_id: id,
    p_revision: Number(text(form, "revision")),
    p_data: parsed.data,
  });
  if (error) return failure(error.message);
  revalidatePath("/clientes");
  redirect(`/clientes/${id}?guardado=perfil`);
}
export async function changeCustomerStatusAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireStaff();
  const parsed = z.object({
    id: uuid,
    revision: z.coerce.number().int().positive(),
    status: z.enum(["active", "inactive", "retired"]),
  }).safeParse({
    id: text(form, "id"),
    revision: text(form, "revision"),
    status: text(form, "status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.status === "retired") {
    const { data, error } = await db.from("customers")
      .select("name").eq("id", parsed.data.id).maybeSingle();
    if (error || !data) return { error: "No pudimos comprobar el perfil." };
    if (text(form, "confirmName").trim() !== data.name)
      return { error: "Escribí el nombre completo exactamente como aparece en el perfil." };
  }
  const { error } = await db.rpc("change_customer_status", {
    p_id: parsed.data.id,
    p_revision: parsed.data.revision,
    p_status: parsed.data.status,
  });
  if (error) return failure(error.message);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${parsed.data.id}`);
  redirect(`/clientes/${parsed.data.id}?guardado=estado`);
}
export async function settingsAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const parsed = z
    .object({
      currency: z.enum([
        "ARS",
        "USD",
        "EUR",
        "UYU",
        "CLP",
        "MXN",
        "COP",
        "PEN",
        "BRL",
      ]),
      timeZone: z.string().min(1).max(80),
    })
    .safeParse({
      currency: text(form, "currency"),
      timeZone: text(form, "timeZone"),
    });
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await db.rpc("configure_gym", {
    p_currency: parsed.data.currency,
    p_time_zone: parsed.data.timeZone,
  });
  if (error) return failure(error.message);
  revalidatePath("/", "layout");
  return { success: "Configuración guardada." };
}
