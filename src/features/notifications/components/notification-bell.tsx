"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createRefreshScheduler } from "@/lib/client/refresh-scheduler";
import { registerOwnerPush } from "../server/actions";
import { subscriptionPayload } from "../domain/browser-push";
export function NotificationBell() {
  const [unread, setUnread] = useState(0),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    // Rebind an already-authorized device after login/password rotation, without prompting.
    if (
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator &&
      Notification.permission === "granted"
    )
      void navigator.serviceWorker.ready
        .then(async (registration) => {
          const sub = await registration.pushManager.getSubscription();
          if (sub) await registerOwnerPush(subscriptionPayload(sub));
        })
        .catch(() => {
          /* The device panel offers an explicit retry. */
        });
    const load = async (signal: AbortSignal) => {
      try {
        const r = await fetch("/api/owner-alerts?summary=1", {
          cache: "no-store",
          signal,
        });
        if (
          !r.ok ||
          !r.headers.get("content-type")?.includes("application/json")
        )
          throw new Error("access");
        const result: unknown = await r.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("unread" in result) ||
          typeof result.unread !== "number"
        )
          throw new Error("payload");
        if (signal.aborted) return;
        setUnread(result.unread);
        setFailed(false);
      } catch {
        if (!signal.aborted) setFailed(true);
      }
    };
    const queue = createRefreshScheduler(
      load,
      () => navigator.onLine && document.visibilityState === "visible",
      600,
    );
    const refresh = () => queue.schedule();
    const initial = setTimeout(() => queue.flush(), 1200);
    const poll = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        window.dispatchEvent(new Event("shelby:alerts-refresh"));
    }, 60_000);
    window.addEventListener("shelby:alerts-refresh", refresh);
    return () => {
      queue.dispose();
      clearTimeout(initial);
      clearInterval(poll);
      window.removeEventListener("shelby:alerts-refresh", refresh);
    };
  }, []);
  return (
    <Link
      href="/avisos"
      prefetch={false}
      className="notification-bell"
      aria-label={
        failed
          ? "Avisos: no se pudo actualizar el contador"
          : `Avisos${unread ? `: ${unread} sin revisar` : ""}`
      }
    >
      <Bell size={19} aria-hidden="true" />
      <span>Avisos</span>
      {unread ? <strong>{unread > 99 ? "99+" : unread}</strong> : null}
      {failed ? <span aria-hidden="true">!</span> : null}
    </Link>
  );
}
