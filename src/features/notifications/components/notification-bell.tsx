"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
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
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/owner-alerts?summary=1", {
          cache: "no-store",
          signal: abort.signal,
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
        setUnread(result.unread);
        setFailed(false);
        window.dispatchEvent(new Event("shelby:alerts-changed"));
      } catch {
        if (!abort.signal.aborted) setFailed(true);
      }
    };
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 600);
    };
    const initial = setTimeout(() => void load(), 1200),
      poll = setInterval(() => void load(), 60_000);
    const db = createClient(),
      channel = db.channel("owner-alerts-updates");
    for (const table of [
      "expenses",
      "expense_payments",
      "customers",
      "subscriptions",
      "payment_batches",
      "owner_notification_reads",
      "owner_notification_settings",
    ])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh,
      );
    channel.subscribe();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("shelby:alerts-refresh", refresh);
    return () => {
      abort.abort();
      clearTimeout(initial);
      clearTimeout(timer);
      clearInterval(poll);
      void db.removeChannel(channel);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
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
