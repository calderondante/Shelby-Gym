"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  registerOwnerPush,
  unregisterOwnerPush,
  testOwnerPush,
} from "../server/actions";
import { subscriptionPayload as payload } from "../domain/browser-push";
function applicationKey(value: string) {
  const bytes = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) view[i] = bytes.charCodeAt(i);
  return buffer;
}
const subscribePlatform = () => () => {};
function platformSnapshot() {
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "install-ios";
  return "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
    ? "ready"
    : "unsupported";
}
export function PushPanel({
  publicKey,
  configured,
}: {
  publicKey: string;
  configured: boolean;
}) {
  const platform = useSyncExternalStore(
    subscribePlatform,
    platformSnapshot,
    () => "loading",
  );
  const supported = platform === "ready",
    iosInstall = platform === "install-ios";
  const [subscription, setSubscription] = useState<PushSubscription | null>(
      null,
    ),
    [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let mounted = true;
    if (supported && Notification.permission === "granted")
      void navigator.serviceWorker.ready
        .then(async (r) => {
          const sub = await r.pushManager.getSubscription();
          if (!sub || !mounted || !configured) return;
          setSubscription(sub);
          const result = await registerOwnerPush(payload(sub));
          if (mounted) {
            setActive(!result.error);
            if (result.error) setMessage(result.error);
          }
        })
        .catch(() => {
          if (mounted)
            setMessage(
              "No pudimos comprobar los avisos del dispositivo. Volvé a intentar.",
            );
        });
    return () => {
      mounted = false;
    };
  }, [configured, supported]);
  const enable = async () => {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          "No se habilitó el permiso. Podés seguir usando la bandeja; para recibir avisos revisá los permisos del dispositivo.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(publicKey),
        }));
      setSubscription(sub);
      const result = await registerOwnerPush(payload(sub));
      setActive(!result.error);
      setMessage(result.error ?? result.success ?? "");
    } catch {
      setMessage(
        "No pudimos activar los avisos. Revisá la conexión y el permiso del sistema; en iPhone abrí la app desde su icono.",
      );
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    if (!subscription) return;
    setBusy(true);
    try {
      const result = await unregisterOwnerPush(subscription.endpoint);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      await subscription.unsubscribe();
      setSubscription(null);
      setActive(false);
      setMessage(
        "Avisos desactivados en este dispositivo. La bandeja sigue disponible.",
      );
    } catch {
      setMessage(
        "No pudimos confirmar la desactivación. Revisá los permisos del dispositivo.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="operation-panel">
      <h2>Avisos en este dispositivo</h2>
      <p>
        Recibí recordatorios aunque la app esté cerrada. La notificación no
        muestra nombres, saldos ni datos de la factura en la pantalla bloqueada.
      </p>
      {!configured || !publicKey ? (
        <p className="notice">
          El envío al dispositivo todavía no está configurado. La bandeja de
          avisos está disponible.
        </p>
      ) : iosInstall ? (
        <p className="notice">
          En iPhone/iPad instalá Shelby Gym desde Safari → Compartir → Añadir a
          pantalla de inicio. Abrila desde el icono para activar avisos
          (iOS/iPadOS 16.4 o posterior).
        </p>
      ) : !supported ? (
        <p className="notice">
          Este navegador no ofrece notificaciones push. Podés usar la bandeja de
          avisos y abrir la app instalada en un navegador compatible.
        </p>
      ) : (
        <div className="communication-tools">
          {!active ? (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => void enable()}
            >
              {busy ? "Activando…" : "Activar notificaciones"}
            </button>
          ) : (
            <strong>Notificaciones activadas en este dispositivo</strong>
          )}
          {subscription ? (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => void disable()}
            >
              Desactivar en este dispositivo
            </button>
          ) : null}
          {active && subscription ? (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await testOwnerPush(payload(subscription));
                  setMessage(result.error ?? result.success ?? "");
                } catch {
                  setMessage(
                    "No pudimos enviar la prueba. Revisá la conexión.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Probar notificación
            </button>
          ) : null}
        </div>
      )}
      {message ? <p role="status">{message}</p> : null}
      <small>
        Sin API de Meta. El sistema operativo puede demorar o silenciar avisos;
        revisá también la bandeja. Cambiar la contraseña o salir de la sesión
        anterior suspende sus avisos hasta volver a entrar.
      </small>
    </section>
  );
}
