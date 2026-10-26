"use client";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CommunicationForm } from "./forms";
import type { Tables } from "@/lib/supabase/database.types";
type Message = Pick<
  Tables<"communication_outbox">,
  | "id"
  | "recipient_name"
  | "status"
  | "channel"
  | "destination"
  | "body"
  | "scheduled_for"
  | "source"
> & { scheduledLabel: string };
export function PreparedMessages({
  messages,
  now,
}: {
  messages: Message[];
  now: string;
}) {
  const [reviewed, setReviewed] = useState<string[]>([]),
    [pendingOnly, setPendingOnly] = useState(false),
    [feedback, setFeedback] = useState<Record<string, string>>({});
  const whatsapp = messages.filter(
    (m) => m.channel === "whatsapp" && m.status === "prepared",
  );
  const visible = pendingOnly
    ? messages.filter(
        (m) =>
          m.channel === "whatsapp" &&
          m.status === "prepared" &&
          !reviewed.includes(m.id),
      )
    : messages;
  const count = whatsapp.filter((m) => reviewed.includes(m.id)).length;
  const copy = async (m: Message) => {
    try {
      await navigator.clipboard.writeText(m.body);
      setFeedback((s) => ({ ...s, [m.id]: "Texto copiado." }));
    } catch {
      setFeedback((s) => ({
        ...s,
        [m.id]:
          "No pudimos copiar. Podés seleccionar el texto del mensaje y copiarlo manualmente.",
      }));
    }
  };
  return (
    <>
      {whatsapp.length ? (
        <div className="manual-whatsapp-tools">
          <p role="status">
            {count} de {whatsapp.length} revisados en esta pantalla
          </p>
          <div className="communication-tools">
            <button
              type="button"
              className="text-action"
              aria-pressed={pendingOnly}
              onClick={() => setPendingOnly(!pendingOnly)}
            >
              Solo WhatsApp por revisar
            </button>
            <button
              type="button"
              className="text-action"
              onClick={() => setReviewed([])}
            >
              Reiniciar revisión
            </button>
          </div>
          <small>
            La marca de revisión organiza esta visita. La app no confirma si
            enviaste o entregaste el mensaje.
          </small>
        </div>
      ) : null}
      {visible.length ? (
        visible.map((m) => {
          const manual = m.status === "prepared" && m.channel === "whatsapp",
            future =
              new Date(m.scheduled_for).getTime() > new Date(now).getTime();
          return (
            <article className="operation-panel" key={m.id}>
              <div className="operation-entry">
                <h3>{m.recipient_name}</h3>
                <strong>
                  {m.status === "cancelled"
                    ? "Cancelado"
                    : "Preparado · Sin enviar desde la app"}
                </strong>
              </div>
              <small>
                {m.channel === "whatsapp" ? "WhatsApp" : "Instagram"} ·{" "}
                {m.destination} · {m.scheduledLabel}
              </small>
              <p className="campaign-message">{m.body}</p>
              <small>
                {m.source === "expense"
                  ? "Boleta a dueño"
                  : m.source === "recovery"
                    ? "Regla de regreso"
                    : "Campaña"}
              </small>
              {manual ? (
                <div className="manual-whatsapp-actions">
                  {future ? (
                    <p className="muted">
                      Podrás abrirlo a partir de la fecha prevista.
                    </p>
                  ) : (
                    <a
                      className={buttonVariants()}
                      href={`/comunicaciones/whatsapp/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir WhatsApp de ${m.recipient_name}`}
                    >
                      Abrir WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => copy(m)}
                    aria-label={`Copiar texto para ${m.recipient_name}`}
                  >
                    Copiar texto
                  </button>
                  <label className="operation-check">
                    <input
                      type="checkbox"
                      checked={reviewed.includes(m.id)}
                      onChange={(e) =>
                        setReviewed((ids) =>
                          e.target.checked
                            ? [...ids, m.id]
                            : ids.filter((id) => id !== m.id),
                        )
                      }
                    />
                    Ya revisé este mensaje para {m.recipient_name}
                  </label>
                  <p className="muted" role="status">
                    {feedback[m.id] ?? ""}
                  </p>
                </div>
              ) : null}
              {m.status === "prepared" ? (
                <CommunicationForm
                  operation="cancel"
                  id={m.id}
                  label="Cancelar preparación"
                >
                  <span className="sr-only">
                    Cancelar mensaje para {m.recipient_name}
                  </span>
                </CommunicationForm>
              ) : null}
            </article>
          );
        })
      ) : (
        <p className="daily-empty">
          {pendingOnly
            ? "No quedan mensajes de WhatsApp por revisar en esta lista. Podés mostrar la lista completa desactivando el filtro."
            : "Todavía no hay mensajes preparados. Podés crear una campaña o revisar las reglas de hoy."}
        </p>
      )}
    </>
  );
}
