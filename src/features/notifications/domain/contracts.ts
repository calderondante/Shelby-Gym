import { z } from "zod";
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const known =
      [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(url.hostname) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/i.test(url.hostname);
    return (
      known &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(4096).refine(allowedPushEndpoint),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
  auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
});
export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  customersEnabled: z.boolean(),
  expensesEnabled: z.boolean(),
  notifyBefore: z.boolean(),
  daysBefore: z.coerce.number().int().min(1).max(30),
  notifyOnDue: z.boolean(),
  notifyOverdue: z.boolean(),
  overdueEvery: z.coerce.number().int().min(1).max(30),
  sendHour: z.coerce.number().int().min(0).max(23),
});
export type OwnerPushSubscription = z.infer<typeof pushSubscriptionSchema>;
