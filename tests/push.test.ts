import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  allowedPushEndpoint,
  notificationSettingsSchema,
} from "../src/features/notifications/domain/contracts";
vi.mock("web-push", () => ({
  default: { sendNotification: vi.fn(async () => ({ statusCode: 201 })) },
}));
import webPush from "web-push";
import { sendOwnerPush } from "../src/features/notifications/server/push-transport";
describe("notificaciones privadas a dispositivos", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    "https://fcm.googleapis.com/fcm/send/test",
    "https://web.push.apple.com/test",
    "https://updates.push.services.mozilla.com/wpush/v2/test",
    "https://wns2-par02p.notify.windows.com/test",
  ])("permite proveedor oficial %s", (url) =>
    expect(allowedPushEndpoint(url)).toBe(true),
  );
  it.each([
    "http://fcm.googleapis.com/test",
    "https://localhost/test",
    "https://127.0.0.1/test",
    "https://169.254.169.254/latest",
    "https://fcm.googleapis.com.evil.test/test",
    "https://fcm.googleapis.com@evil.test/test",
    "https://web.push.apple.com:8080/test",
    "https://web.push.apple.com/test#fragment",
  ])("rechaza destino no permitido %s", (url) =>
    expect(allowedPushEndpoint(url)).toBe(false),
  );
  it("envía un aviso genérico sin nombres, saldos ni URLs externas", async () => {
    await sendOwnerPush(
      {
        endpoint: "https://web.push.apple.com/fake-test-only",
        p256dh: "A".repeat(87),
        auth: "B".repeat(22),
      },
      {
        publicKey: "public-test",
        privateKey: "private-test-not-real",
        subject: "https://example.test",
      },
    );
    const args = vi.mocked(webPush.sendNotification).mock.calls[0];
    const body = JSON.parse(String(args[1]));
    expect(body.url).toBe("/avisos");
    expect(body.body).not.toContain("$");
    expect(Object.keys(body).sort()).toEqual(["body", "tag", "title", "url"]);
  });
  it("rechaza SSRF antes de contactar al transporte", async () => {
    await expect(
      sendOwnerPush(
        {
          endpoint: "https://localhost/admin",
          p256dh: "A".repeat(87),
          auth: "B".repeat(22),
        },
        { publicKey: "p", privateKey: "s", subject: "https://example.test" },
      ),
    ).rejects.toThrow();
    expect(webPush.sendNotification).not.toHaveBeenCalled();
  });
  it("limita la hora y los días de los avisos", () =>
    expect(
      notificationSettingsSchema.safeParse({
        enabled: true,
        customersEnabled: true,
        expensesEnabled: true,
        notifyBefore: true,
        daysBefore: 0,
        notifyOnDue: true,
        notifyOverdue: true,
        overdueEvery: 0,
        sendHour: 24,
      }).success,
    ).toBe(false));
});
