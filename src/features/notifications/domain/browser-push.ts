export function subscriptionPayload(sub: PushSubscription) {
  return {
    endpoint: sub.endpoint,
    p256dh: sub.toJSON().keys?.p256dh ?? "",
    auth: sub.toJSON().keys?.auth ?? "",
  };
}
