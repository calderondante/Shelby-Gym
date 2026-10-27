"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/features/gym/server/session";
import type { ActionResult } from "@/features/gym/server/actions";
import {
  notificationSettingsSchema,
  pushSubscriptionSchema,
  allowedPushEndpoint,
} from "../domain/contracts";
import { sendOwnerPush } from "./push-transport";

export async function saveNotificationSettings(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const data = notificationSettingsSchema.safeParse({
    enabled: form.has("enabled"),
    customersEnabled: form.has("customersEnabled"),
    expensesEnabled: form.has("expensesEnabled"),
    notifyBefore: form.has("notifyBefore"),
    daysBefore: form.get("daysBefore"),
    notifyOnDue: form.has("notifyOnDue"),
    notifyOverdue: form.has("notifyOverdue"),
    overdueEvery: form.get("overdueEvery"),
    sendHour: form.get("sendHour"),
  });
  const revision = z.coerce
    .number()
    .int()
    .min(1)
    .safeParse(form.get("revision"));
  if (!data.success || !revision.success)
    return { error: "Revisá los días, la hora y las opciones de aviso." };
  const result = await db.rpc("configure_owner_notifications", {
    p_revision: revision.data,
    p_data: data.data,
  });
  if (result.error)
    return {
      error:
        result.error.message === "STALE_NOTIFICATION_SETTINGS"
          ? "Otro dispositivo cambió los avisos. Actualizá antes de guardar."
          : "No pudimos guardar las preferencias.",
    };
  revalidatePath("/avisos");
  return { success: "Preferencias guardadas." };
}
export async function markOwnerAlert(
  key: string,
  read: boolean,
): Promise<ActionResult> {
  const { db, staff } = await requireOwner();
  if (
    !z.string().min(1).max(250).safeParse(key).success ||
    typeof read !== "boolean"
  )
    return { error: "Aviso inválido." };
  const current = await db
    .from("owner_alerts")
    .select("alert_key")
    .eq("alert_key", key)
    .maybeSingle();
  if (current.error || !current.data)
    return { error: "El aviso cambió. Actualizá la bandeja." };
  const result = read
    ? await db.from("owner_notification_reads").upsert({
        staff_id: staff.id,
        alert_key: key,
        read_at: new Date().toISOString(),
      })
    : await db
        .from("owner_notification_reads")
        .delete()
        .eq("staff_id", staff.id)
        .eq("alert_key", key);
  if (result.error) return { error: "No pudimos cambiar la marca de lectura." };
  revalidatePath("/avisos");
  return { success: read ? "Aviso revisado." : "Aviso marcado para revisar." };
}
export async function registerOwnerPush(value: unknown): Promise<ActionResult> {
  const { db } = await requireOwner();
  const sub = pushSubscriptionSchema.safeParse(value);
  if (!sub.success)
    return { error: "El navegador devolvió una suscripción inválida." };
  const result = await db.rpc("register_owner_push", { p_data: sub.data });
  if (result.error)
    return {
      error:
        "No pudimos vincular los avisos a esta sesión. Desactivá y volvé a activarlos.",
    };
  return { success: "Avisos activados en este dispositivo." };
}
export async function unregisterOwnerPush(
  endpoint: string,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  if (!allowedPushEndpoint(endpoint)) return { error: "Suscripción inválida." };
  const result = await db.rpc("unregister_owner_push", {
    p_endpoint: endpoint,
  });
  return result.error
    ? { error: "No pudimos desactivar los avisos. Volvé a intentar." }
    : { success: "Avisos desactivados en este dispositivo." };
}
export async function testOwnerPush(value: unknown): Promise<ActionResult> {
  const { db } = await requireOwner();
  const sub = pushSubscriptionSchema.safeParse(value);
  if (!sub.success) return { error: "Suscripción inválida." };
  const reserved = await db.rpc("reserve_owner_push_test", {
    p_endpoint: sub.data.endpoint,
  });
  if (reserved.error || !reserved.data)
    return {
      error:
        "Activá los avisos en esta sesión y esperá un minuto entre pruebas.",
    };
  const {
    SHELBY_VAPID_PUBLIC_KEY: publicKey,
    SHELBY_VAPID_PRIVATE_KEY: privateKey,
    SHELBY_VAPID_SUBJECT: subject,
  } = process.env;
  if (!publicKey || !privateKey || !subject)
    return { error: "El envío al dispositivo todavía no está configurado." };
  try {
    await sendOwnerPush(sub.data, { publicKey, privateKey, subject }, true);
    return {
      success:
        "Prueba aceptada por el servicio de notificaciones. Revisá este dispositivo.",
    };
  } catch {
    return {
      error:
        "El servicio no aceptó la prueba. Revisá permisos y conexión; podés desactivar y volver a activar los avisos.",
    };
  }
}
