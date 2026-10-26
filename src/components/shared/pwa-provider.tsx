"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
type InstallState = {
  prompt: InstallPromptEvent | null;
  installed: boolean;
  clearPrompt(): void;
};
const InstallContext = createContext<InstallState | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const updateDisplay = () =>
      setInstalled(
        display.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    updateDisplay();
    display.addEventListener("change", updateDisplay);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Installation through the browser menu remains available; the app stays online-only.
          console.warn(
            "No se pudo preparar la pantalla sin conexión. Shelby Gym sigue disponible con internet.",
          );
        });
    }
    return () => {
      display.removeEventListener("change", updateDisplay);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return (
    <InstallContext.Provider
      value={{ prompt, installed, clearPrompt: () => setPrompt(null) }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function InstallApp({ compact = false }: { compact?: boolean }) {
  const state = useContext(InstallContext);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  if (state.installed)
    return compact ? null : (
      <p className="muted">Shelby Gym ya está instalada en este dispositivo.</p>
    );
  const install = async () => {
    if (!state.prompt || busy) return;
    setBusy(true);
    try {
      await state.prompt.prompt();
      const choice = await state.prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Instalación aceptada. Buscá el icono Shelby Gym en tu dispositivo."
          : "Podés instalarla más adelante desde el menú del navegador.",
      );
    } catch {
      setMessage(
        "No pudimos abrir la instalación. Seguí los pasos del menú del navegador que aparecen abajo.",
      );
    } finally {
      state.clearPrompt();
      setBusy(false);
    }
  };
  return (
    <section
      className={
        compact
          ? "install-app install-app-compact"
          : "operation-panel install-app"
      }
      aria-label="Instalar Shelby Gym"
    >
      <details>
        <summary>Instalar Shelby Gym</summary>
        <p>
          Abrila desde su icono, en una ventana propia sin la barra de
          direcciones. Necesita conexión a internet.
        </p>
        {state.prompt ? (
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={install}
          >
            {busy ? "Abriendo instalación…" : "Instalar en este dispositivo"}
          </button>
        ) : null}
        <ul>
          <li>
            <strong>Android:</strong> en Chrome, menú ⋮ → Instalar app o Añadir
            a pantalla de inicio.
          </li>
          <li>
            <strong>iPhone:</strong> abrí este enlace en Safari → Compartir →
            Añadir a pantalla de inicio → Añadir. Si aparece «Abrir como app
            web», dejalo activado.
          </li>
          <li>
            <strong>PC:</strong> en Chrome o Edge, usá el icono de instalación
            en la barra de direcciones o la opción de instalar en su menú.
          </li>
        </ul>
        <p className="muted">
          Si abriste el enlace dentro de WhatsApp o Instagram, primero elegí
          abrirlo en Chrome o Safari. La contraseña sigue protegiendo el acceso.
        </p>
        {message ? <p role="status">{message}</p> : null}
      </details>
    </section>
  );
}
