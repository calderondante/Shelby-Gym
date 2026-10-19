"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
export function LiveSync() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "connecting" | "live" | "offline" | "retry"
  >("connecting");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const db = createClient();
    let timeout: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => startTransition(() => router.refresh()), 250);
    };
    const channel = db.channel("gym-updates");
    for (const table of [
      "customers",
      "activities",
      "subscriptions",
      "payment_batches",
    ])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh,
      );
    channel.subscribe((s) =>
      setStatus(
        !navigator.onLine
          ? "offline"
          : s === "SUBSCRIBED"
            ? "live"
            : s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED"
              ? "retry"
              : "connecting",
      ),
    );
    const online = () => {
      setStatus("connecting");
      refresh();
    };
    const offline = () => setStatus("offline");
    const focus = () => {
      if (document.visibilityState === "visible" && navigator.onLine) refresh();
    };
    const poll = setInterval(focus, 30_000);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", focus);
    return () => {
      clearTimeout(timeout);
      clearInterval(poll);
      void db.removeChannel(channel);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [router]);
  return (
    <div className="live-sync">
      <span role="status">
        <span className="sync-dot" data-live={status === "live"} />
        {pending
          ? "Actualizando…"
          : status === "live"
            ? "En vivo"
            : status === "offline"
              ? "Sin conexión · datos sin actualizar"
              : status === "retry"
                ? "Reconectando · actualización cada 30 s"
                : "Conectando…"}
      </span>
      <Button
        variant="ghost"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
      >
        Actualizar
      </Button>
    </div>
  );
}
