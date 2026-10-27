// Shared by authenticated Server Actions and the scheduled function. No env values here.
import webPush from "web-push";
import { pushSubscriptionSchema } from "../domain/contracts";
export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};
export async function sendOwnerPush(
  value: unknown,
  vapid: VapidConfig,
  test = false,
) {
  const sub = pushSubscriptionSchema.parse(value);
  return webPush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({
      title: "Shelby Gym",
      body: test
        ? "Los avisos están activados en este dispositivo."
        : "Tenés vencimientos para revisar. Abrí Avisos para ver el estado actual.",
      url: "/avisos",
      tag: "shelby-owner-alerts",
    }),
    { vapidDetails: vapid, TTL: 3600, urgency: "normal", timeout: 6000 },
  );
}
export function pushErrorCode(error: unknown): number | null {
  return typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
    ? error.statusCode
    : null;
}
