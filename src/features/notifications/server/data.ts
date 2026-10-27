import "server-only";
import { requireOwner } from "@/features/gym/server/session";
export async function getOwnerAlertData() {
  const { db } = await requireOwner();
  const [alerts, settings, health] = await Promise.all([
    db
      .from("owner_alerts")
      .select("*")
      .order("due_on")
      .order("alert_key")
      .limit(500),
    db.from("owner_notification_settings").select("*").eq("id", true).single(),
    db.rpc("owner_notification_health"),
  ]);
  if (alerts.error || settings.error || health.error)
    throw new Error("No pudimos cargar los avisos. Volvé a intentar.");
  return {
    alerts: alerts.data,
    settings: settings.data,
    lastCheck: health.data ?? null,
    publicKey: process.env.SHELBY_VAPID_PUBLIC_KEY ?? "",
    pushConfigured: Boolean(
      process.env.SHELBY_VAPID_PRIVATE_KEY &&
      process.env.SHELBY_NOTIFICATION_WORKER_EMAIL &&
      process.env.SHELBY_NOTIFICATION_WORKER_PASSWORD,
    ),
  };
}
