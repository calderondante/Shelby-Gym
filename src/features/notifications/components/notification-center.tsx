"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import { money } from "@/features/gym/domain/money";
import { dateLabel } from "@/features/gym/domain/dates";
import { markOwnerAlert, saveNotificationSettings } from "../server/actions";
import { PushPanel } from "./push-panel";
type Data = {
  alerts: Tables<"owner_alerts">[];
  settings: Tables<"owner_notification_settings">;
  lastCheck: string | null;
  publicKey: string;
  pushConfigured: boolean;
};
function Settings({
  value,
  onSaved,
  onStart,
}: {
  value: Data["settings"];
  onSaved(message: string): void;
  onStart(): void;
}) {
  const [state, action] = useActionState(
    async (
      previous: Parameters<typeof saveNotificationSettings>[0],
      form: FormData,
    ) => {
      const result = await saveNotificationSettings(previous, form);
      if (!result.error) onSaved(result.success ?? "Preferencias guardadas.");
      return result;
    },
    {},
  );
  return (
    <details className="operation-panel">
      <summary>Preferencias de vencimiento</summary>
      <form action={action} className="operation-form" onSubmit={onStart}>
        <input type="hidden" name="revision" value={value.revision} />
        <label className="operation-check">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={value.enabled}
          />
          Enviar también notificaciones al celular
        </label>
        <label className="operation-check">
          <input
            type="checkbox"
            name="customersEnabled"
            defaultChecked={value.customers_enabled}
          />
          Vencimientos de cuotas de clientes activos
        </label>
        <label className="operation-check">
          <input
            type="checkbox"
            name="expensesEnabled"
            defaultChecked={value.expenses_enabled}
          />
          Facturas y servicios pendientes
        </label>
        <label className="operation-check">
          <input
            type="checkbox"
            name="notifyBefore"
            defaultChecked={value.notify_before}
          />
          Avisar antes del vencimiento
        </label>
        <label>
          Días de anticipación
          <input
            type="number"
            name="daysBefore"
            min={1}
            max={30}
            required
            defaultValue={value.days_before}
          />
        </label>
        <label className="operation-check">
          <input
            type="checkbox"
            name="notifyOnDue"
            defaultChecked={value.notify_on_due}
          />
          Avisar el día del vencimiento
        </label>
        <label className="operation-check">
          <input
            type="checkbox"
            name="notifyOverdue"
            defaultChecked={value.notify_overdue}
          />
          Repetir mientras siga vencido y pendiente
        </label>
        <label>
          Repetir cada cuántos días
          <input
            type="number"
            name="overdueEvery"
            min={1}
            max={30}
            required
            defaultValue={value.overdue_every}
          />
        </label>
        <label>
          Hora del aviso (Argentina)
          <input
            type="number"
            name="sendHour"
            min={0}
            max={23}
            required
            defaultValue={value.send_hour}
          />
        </label>
        <p className="muted">
          Se revisan los vencimientos cada hora y se envía como máximo un
          resumen por día y dispositivo, a partir de la hora elegida. El aviso
          previo no se repite para la misma situación.
        </p>
        <FormFeedback state={{ error: state.error }} />
        <SubmitButton>Guardar preferencias</SubmitButton>
      </form>
    </details>
  );
}
export function NotificationCenter({ initialData }: { initialData: Data }) {
  const [data, setData] = useState<Data | null>(initialData),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("pending"),
    [kind, setKind] = useState("all"),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/owner-alerts", { cache: "no-store" });
      if (!r.ok || !r.headers.get("content-type")?.includes("application/json"))
        throw new Error("access");
      const result: Data = await r.json();
      if (
        !Array.isArray(result.alerts) ||
        !result.settings ||
        typeof result.publicKey !== "string"
      )
        throw new Error("payload");
      setData(result);
      setError("");
    } catch {
      setError(
        "No pudimos actualizar la bandeja. Revisá la conexión y tu sesión antes de volver a intentar.",
      );
    }
  }, []);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("shelby:alerts-changed", refresh);
    return () => window.removeEventListener("shelby:alerts-changed", refresh);
  }, [load]);
  const saved = (message?: string) => {
    if (message) setNotice(message);
    void load();
    window.dispatchEvent(new Event("shelby:alerts-refresh"));
  };
  const alerts =
    data?.alerts.filter(
      (a) =>
        (filter !== "pending" || !a.is_read) &&
        (kind === "all" || a.kind === kind),
    ) ?? [];
  return (
    <>
      <div className="operation-tabs">
        <Link href="/comunicaciones">Mensajes a clientes</Link>
        <Link href="/historial/gastos">Facturas y gastos</Link>
        <button className="text-link" type="button" onClick={() => void load()}>
          Actualizar avisos
        </button>
      </div>
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : null}
      {!data && !error ? <p role="status">Cargando vencimientos…</p> : null}
      {data ? (
        <>
          <div className="notification-filters">
            <label>
              Revisión
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="pending">Sin revisar</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <label>
              Tipo de aviso
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">Todos los vencimientos</option>
                <option value="expense">Facturas y servicios</option>
                <option value="customer">Cuotas de clientes</option>
              </select>
            </label>
          </div>
          <p className="muted">
            Marcar un aviso como revisado no paga una factura ni renueva una
            cuota. Al saldar el gasto, renovar o dar de baja el perfil, su
            situación se actualiza.
          </p>
          {alerts.length ? (
            <div className="operation-section">
              {alerts.map((a) => (
                <article className="operation-panel" key={a.alert_key}>
                  <div className="operation-entry">
                    <h2>{a.title}</h2>
                    <strong
                      className={a.phase === "overdue" ? "danger-text" : ""}
                    >
                      {a.phase === "overdue"
                        ? "Vencido"
                        : a.phase === "today"
                          ? "Vence hoy"
                          : "Próximo a vencer"}
                    </strong>
                  </div>
                  <p>
                    Vencimiento: {dateLabel(a.due_on!)}
                    {a.balance_cents! > 0
                      ? ` · Pendiente ${money(a.balance_cents!, "ARS")}`
                      : " · Revisá la renovación de la cuota"}
                  </p>
                  <div className="communication-tools">
                    <Link className="text-link" href={a.href!}>
                      {a.kind === "expense"
                        ? "Ver factura y registrar pago"
                        : "Ver cliente"}
                    </Link>
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy === a.alert_key}
                      onClick={async () => {
                        setBusy(a.alert_key!);
                        try {
                          const result = await markOwnerAlert(
                            a.alert_key!,
                            !a.is_read,
                          );
                          if (result.error) setError(result.error);
                          else saved();
                        } catch {
                          setError("No pudimos guardar la marca de revisión.");
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      {a.is_read ? "Marcar sin revisar" : "Marcar revisado"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="daily-empty">
              No hay avisos para este filtro. La bandeja se actualiza según las
              cuotas, facturas y preferencias.
            </p>
          )}
          <PushPanel
            publicKey={data.publicKey}
            configured={data.pushConfigured}
          />
          <p className="muted">
            {data.lastCheck
              ? `Última revisión automática: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(data.lastCheck))}.`
              : "La primera revisión automática está pendiente."}
          </p>
          <Settings
            key={data.settings.revision}
            value={data.settings}
            onSaved={saved}
            onStart={() => setNotice("")}
          />
        </>
      ) : null}
    </>
  );
}
