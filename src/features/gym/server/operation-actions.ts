"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner, requireStaff } from "./session";
import {
  amount,
  paymentLines,
  paymentSchema,
  uuid,
} from "../validation/contracts";
import type { ActionResult } from "./actions";

const value = (form: FormData, name: string) => String(form.get(name) ?? "");
const expenseSchema = z.object({
  title: z.string().trim().min(2).max(100),
  category: z.string().trim().min(1).max(60),
  amount: amount.refine((n) => n > 0, "Ingresá un importe mayor a cero."),
  dueOn: z.iso.date(),
  notes: z.string().trim().max(500),
  supplier: z.string().trim().max(160),
  invoiceNumber: z.string().trim().max(80),
});
const errors: Record<string, string> = {
  DUPLICATE_INVOICE:
    "Ya hay una factura con ese proveedor y número. Revisá Gastos antes de registrarla de nuevo.",
  OVERPAYMENT:
    "El importe supera el saldo actual. Actualizá antes de registrar el pago.",
  BELOW_PAID: "El gasto no puede quedar por debajo de lo que ya se pagó.",
  FORBIDDEN: "Tu cuenta no tiene permiso para esta operación.",
  MONTH_CLOSED:
    "Ese mes ya está cerrado. Conservamos el cierre y sus movimientos.",
  INVALID_MONTH: "Elegí un mes válido. Solo se pueden cerrar meses terminados.",
  STALE_EXPENSE:
    "El gasto cambió en otro dispositivo. Actualizá antes de guardar.",
  NO_SESSIONS: "No quedan clases disponibles en este pack.",
  CUSTOMER_INACTIVE: "Reactivá el perfil antes de registrar una clase.",
  DEBT_CONFIRMATION_REQUIRED:
    "El pack tiene saldo pendiente. Confirmá la asistencia con deuda.",
  INVALID_REVERSAL: "La operación ya se corrigió o falta explicar el motivo.",
  RECIPIENTS_CHANGED:
    "Cambió la situación de algún destinatario. Actualizá y revisá la selección.",
  REQUEST_CONFLICT:
    "La operación ya se guardó con otros datos. Actualizá la pantalla.",
};
function failed(message: string): ActionResult {
  return {
    error:
      errors[message] ??
      "No pudimos guardar. Revisá los datos y la conexión antes de reintentar.",
  };
}
function parsePayments(form: FormData) {
  return paymentSchema.safeParse(
    Object.fromEntries(
      ["cash", "transfer", "mercado_pago"].map((key) => [
        key,
        value(form, key) || "0",
      ]),
    ),
  );
}
export async function operationAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const op = value(form, "operation");
  const id = value(form, "id");
  const revision = Number(value(form, "revision"));
  const requestId = value(form, "requestId");
  const month = value(form, "month");
  let destinationMonth = month;
  if (id && !uuid.safeParse(id).success) return { error: "Registro inválido." };
  if (
    id &&
    (!Number.isInteger(revision) || revision < 1) &&
    ["expense", "template"].includes(op)
  )
    return { error: "Actualizá el formulario." };
  if (
    ["expense", "expense-payment", "expense-reversal", "campaign"].includes(
      op,
    ) &&
    !uuid.safeParse(requestId).success
  )
    return { error: "Operación inválida." };
  if (op === "expense") {
    const parsed = expenseSchema.safeParse(
      Object.fromEntries(
        [
          "title",
          "category",
          "amount",
          "dueOn",
          "notes",
          "supplier",
          "invoiceNumber",
        ].map((key) => [key, value(form, key)]),
      ),
    );
    if (!parsed.success)
      return {
        error: "Revisá el concepto, importe y vencimiento.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      };
    destinationMonth = parsed.data.dueOn.slice(0, 7);
    const result = await db.rpc("save_expense", {
      p_id: id || null,
      p_revision: revision || 0,
      p_request: requestId,
      p_data: parsed.data,
    });
    if (result.error) return failed(result.error.message);
  } else if (op === "template") {
    const parsed = z
      .object({
        title: z.string().trim().min(2).max(100),
        category: z.string().trim().min(1).max(60),
        amount: amount.refine((n) => n > 0),
        dueDay: z.coerce.number().int().min(1).max(31),
        active: z.boolean(),
      })
      .safeParse({
        title: value(form, "title"),
        category: value(form, "category"),
        amount: value(form, "amount"),
        dueDay: value(form, "dueDay"),
        active: form.get("active") === "on",
      });
    if (!parsed.success)
      return { error: "Revisá la plantilla y el día de vencimiento (1 a 31)." };
    const result = await db.rpc("save_expense_template", {
      p_id: id || null,
      p_revision: revision || 0,
      p_data: parsed.data,
    });
    if (result.error) return failed(result.error.message);
  } else if (op === "generate" || op === "close") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      return { error: "Mes inválido." };
    if (op === "close" && form.get("confirm") !== "on")
      return {
        error: "Confirmá que revisaste el mes para conservar su cierre.",
      };
    const result =
      op === "generate"
        ? await db.rpc("generate_monthly_expenses", { p_month: `${month}-01` })
        : await db.rpc("close_gym_month", { p_month: `${month}-01` });
    if (result.error) return failed(result.error.message);
  } else if (op === "expense-payment" || op === "expense-reversal") {
    if (!id) return { error: "Gasto inválido." };
    const parsed = parsePayments(form);
    const reverse = value(form, "reverseId");
    const reason = value(form, "reason").trim();
    if (op === "expense-payment" && !parsed.success)
      return { error: "Registrá un importe válido en uno o varios medios." };
    if (
      op === "expense-reversal" &&
      (!uuid.safeParse(reverse).success ||
        reason.length < 3 ||
        reason.length > 300)
    )
      return { error: "Explicá el motivo de la corrección." };
    const result = await db.rpc("pay_expense", {
      p_expense: id,
      p_request: requestId,
      p_entries: parsed.success && !reverse ? paymentLines(parsed.data) : [],
      p_reverse: reverse || null,
      p_reason: reason,
    });
    if (result.error) return failed(result.error.message);
  } else if (op === "campaign") {
    const parsed = z
      .object({
        title: z.string().trim().min(2).max(100),
        message: z.string().trim().min(5).max(1500),
        activity: z.union([uuid, z.literal("")]),
        customers: z.array(uuid).min(1).max(500),
      })
      .safeParse({
        title: value(form, "title"),
        message: value(form, "message"),
        activity: value(form, "activity"),
        customers: form.getAll("customers"),
      });
    if (!parsed.success)
      return {
        error:
          "Completá el mensaje y seleccioná al menos un destinatario habilitado.",
      };
    const result = await db.rpc("save_recovery_campaign", {
      p_request: requestId,
      p_title: parsed.data.title,
      p_message: parsed.data.message,
      p_activity: parsed.data.activity || null,
      p_customers: parsed.data.customers,
    });
    if (result.error) return failed(result.error.message);
    revalidatePath("/campanas");
    redirect("/campanas?guardado=1");
  } else return { error: "Operación no disponible." };
  revalidatePath("/historial");
  revalidatePath("/historial/gastos");
  redirect(
    `/historial/gastos${/^\d{4}-(0[1-9]|1[0-2])$/.test(destinationMonth) ? `?mes=${destinationMonth}&guardado=1` : "?guardado=1"}`,
  );
}
export async function sessionAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireStaff();
  const customerId = value(form, "customerId"),
    subscriptionId = value(form, "subscriptionId"),
    request = value(form, "requestId"),
    reverse = value(form, "reverseId"),
    reason = value(form, "reason").trim();
  if (
    ![customerId, subscriptionId, request].every(
      (id) => uuid.safeParse(id).success,
    ) ||
    (reverse && !uuid.safeParse(reverse).success) ||
    reason.length > 300
  )
    return { error: "Operación inválida." };
  const result = await db.rpc("record_session", {
    p_subscription: subscriptionId,
    p_request: request,
    p_acknowledge_debt: form.get("acknowledgeDebt") === "on",
    p_reverse: reverse || null,
    p_reason: reason,
  });
  if (result.error) return failed(result.error.message);
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/clientes");
  revalidatePath("/historial");
  return {
    success: reverse
      ? "Corrección registrada. Se devolvió una clase al pack."
      : "Clase registrada. El contador quedó actualizado.",
  };
}
