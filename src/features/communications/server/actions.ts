"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/features/gym/server/session";
import { uuid, instagramHandle } from "@/features/gym/validation/contracts";
import type { ActionResult } from "@/features/gym/server/actions";
import {
  channelSchema,
  normalizePhone,
  templateSchema,
  templateError,
} from "../domain/messages";
const text = (form: FormData, name: string) => String(form.get(name) ?? "");
const checked = (form: FormData, name: string) => form.get(name) === "on";
const errors: Record<string, string> = {
  FORBIDDEN: "Solo el dueño puede administrar las comunicaciones.",
  STALE_COMMUNICATION:
    "Otra persona actualizó esta configuración. Recargá para revisar los cambios.",
  TEMPLATE_MISMATCH:
    "La plantilla debe corresponder al canal y tipo de mensaje. Las que usa una regla deben conservar su tipo.",
  UNKNOWN_MESSAGE_VARIABLE:
    "El mensaje contiene una variable que no corresponde a esta plantilla.",
  RECIPIENTS_CHANGED:
    "Cambió la situación de un cliente. Revisá el número, la autorización y el vencimiento antes de preparar.",
  SELECT_RECIPIENTS: "Seleccioná entre 1 y 500 destinatarios habilitados.",
  REQUEST_CONFLICT:
    "Esta preparación ya se registró con otros datos. Recargá la página.",
  INVALID_SCHEDULE: "Revisá la fecha y el horario de la preparación.",
  MESSAGE_UNAVAILABLE: "Este mensaje ya se canceló o no está disponible.",
};
const phone = z
  .string()
  .transform(normalizePhone)
  .refine(
    (v): v is string => v !== null,
    "Usá el número internacional con + y código de país.",
  );
export async function communicationAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const op = text(form, "operation"),
    id = text(form, "id"),
    revision = Number(text(form, "revision"));
  if (id && !uuid.safeParse(id).success) return { error: "Registro inválido." };
  const failure = (error: {
    message: string;
    code?: string;
  }): ActionResult => ({
    error:
      error.code === "23505"
        ? "Ese número ya está registrado entre los dueños. Podés editarlo en la lista."
        : (errors[error.message] ??
          "No pudimos guardar. Conservamos el formulario para que puedas revisar e intentar nuevamente."),
  });
  let section = "campanas";
  if (op === "config") {
    section = "canales";
    const parsed = z
      .object({
        businessName: z.string().trim().min(2).max(100),
        whatsappPhone: z.union([z.literal(""), phone]),
        instagramHandle,
      })
      .safeParse({
        businessName: text(form, "businessName"),
        whatsappPhone: text(form, "whatsappPhone"),
        instagramHandle: text(form, "instagramHandle"),
      });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const result = await db.rpc("save_communication_settings", {
      p_revision: revision,
      p_data: parsed.data,
    });
    if (result.error) return failure(result.error);
  } else if (op === "template") {
    section = "plantillas";
    const parsed = templateSchema.safeParse({
      title: text(form, "title"),
      channel: text(form, "channel"),
      purpose: text(form, "purpose"),
      body: text(form, "body"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const result = await db.rpc("save_communication_template", {
      p_id: id || null,
      p_revision: revision || 0,
      p_data: parsed.data,
    });
    if (result.error) return failure(result.error);
  } else if (op === "owner") {
    section = "duenos";
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(100),
        phone,
        active: z.boolean(),
      })
      .safeParse({
        name: text(form, "name"),
        phone: text(form, "phone"),
        active: checked(form, "active"),
      });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const result = await db.rpc("save_communication_owner", {
      p_id: id || null,
      p_revision: revision || 0,
      p_data: parsed.data,
    });
    if (result.error) return failure(result.error);
  } else if (op === "rule") {
    section = "automatizaciones";
    const parsed = z
      .object({
        kind: z.enum(["recovery", "expense"]),
        enabled: z.boolean(),
        channel: channelSchema,
        templateId: uuid,
        sendHour: z.coerce.number().int().min(0).max(23),
        audience: z.enum(["selected", "all_eligible"]),
        notifyBefore: z.boolean(),
        daysBefore: z.coerce.number().int().min(1).max(30),
        notifyOnDue: z.boolean(),
        notifyOverdue: z.boolean(),
        overdueEvery: z.coerce.number().int().min(1).max(30),
        recurringOnly: z.boolean(),
        offer: z.string().trim().max(500),
        customers: z.array(uuid).max(500),
      })
      .safeParse({
        kind: text(form, "kind"),
        enabled: checked(form, "enabled"),
        channel: text(form, "channel"),
        templateId: text(form, "templateId"),
        sendHour: text(form, "sendHour"),
        audience: text(form, "audience"),
        notifyBefore: checked(form, "notifyBefore"),
        daysBefore: text(form, "daysBefore") || "3",
        notifyOnDue: checked(form, "notifyOnDue"),
        notifyOverdue: checked(form, "notifyOverdue"),
        overdueEvery: text(form, "overdueEvery") || "1",
        recurringOnly: checked(form, "recurringOnly"),
        offer: text(form, "offer"),
        customers: form.getAll("customers"),
      });
    if (!parsed.success)
      return {
        error:
          "Revisá la plantilla, los destinatarios y los plazos (1 a 30 días).",
      };
    const { kind, customers, ...data } = parsed.data;
    if (
      data.enabled &&
      kind === "recovery" &&
      data.audience === "selected" &&
      !customers.length
    )
      return { error: errors.SELECT_RECIPIENTS };
    const result = await db.rpc("save_communication_rule", {
      p_kind: kind,
      p_revision: revision,
      p_data: data,
      p_customers: customers,
    });
    if (result.error) return failure(result.error);
  } else if (op === "campaign") {
    const parsed = z
      .object({
        requestId: uuid,
        title: z.string().trim().min(2).max(100),
        channel: channelSchema,
        segment: z.enum(["selected", "recovery"]),
        templateId: uuid,
        body: z.string().trim().min(5).max(1500),
        offer: z.string().trim().max(500),
        scheduledFor: z.union([
          z.literal(""),
          z.iso.datetime({ offset: true }),
        ]),
        customers: z.array(uuid).min(1).max(500),
      })
      .safeParse({
        requestId: text(form, "requestId"),
        title: text(form, "title"),
        channel: text(form, "channel"),
        segment: text(form, "segment"),
        templateId: text(form, "templateId"),
        body: text(form, "body"),
        offer: text(form, "offer"),
        scheduledFor: text(form, "scheduledFor"),
        customers: form.getAll("customers"),
      });
    if (!parsed.success)
      return {
        error:
          "Completá el mensaje y elegí entre 1 y 500 destinatarios habilitados.",
      };
    const bodyError = templateError(
      parsed.data.body,
      parsed.data.segment === "recovery" ? "recovery" : "general",
    );
    if (bodyError) return { error: bodyError };
    const { requestId, customers, ...data } = parsed.data;
    const result = await db.rpc("prepare_communication_campaign", {
      p_request: requestId,
      p_data: data,
      p_customers: customers,
    });
    if (result.error) return failure(result.error);
    section = "historial";
  } else if (op === "preview") {
    section = "historial";
    const day = text(form, "day");
    if (day && !z.iso.date().safeParse(day).success)
      return { error: "Elegí una fecha válida para revisar los avisos." };
    const result = await db.rpc("prepare_communication_automations", {
      p_day: day || null,
    });
    if (result.error) return failure(result.error);
  } else if (op === "cancel") {
    section = "historial";
    if (!id) return { error: "Mensaje inválido." };
    const result = await db.rpc("cancel_communication", { p_id: id });
    if (result.error) return failure(result.error);
  } else return { error: "Operación no disponible." };
  revalidatePath("/comunicaciones");
  revalidatePath("/campanas");
  redirect(`/comunicaciones?seccion=${section}&guardado=1`);
}
