"use client";
import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import type { ActionResult } from "@/features/gym/server/actions";
import type { Tables } from "@/lib/supabase/database.types";
import { communicationAction } from "../server/actions";
import {
  purposeVariables,
  recipientReason,
  renderMessage,
  type Channel,
  type Purpose,
  type Recipient,
} from "../domain/messages";
import { money } from "@/features/gym/domain/money";
import { dateLabel } from "@/features/gym/domain/dates";
type Template = Tables<"communication_templates">;
export function CommunicationForm({
  operation,
  id = "",
  revision = 0,
  requestId = "",
  label,
  children,
}: {
  operation: string;
  id?: string;
  revision?: number;
  requestId?: string;
  label: string;
  children: ReactNode;
}) {
  const keepDraft = useRef(false);
  const [state, action] = useActionState(
    async (previous: ActionResult, data: FormData) => {
      keepDraft.current = false;
      const result = await communicationAction(previous, data);
      keepDraft.current = Boolean(result.error);
      return result;
    },
    {},
  );
  return (
    <form
      action={action}
      className="operation-form"
      onReset={(e) => {
        if (keepDraft.current) e.preventDefault();
      }}
    >
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="requestId" value={requestId} />
      {children}
      <FormFeedback state={state} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}
function Preview({
  body,
  recipient,
  offer,
  business,
}: {
  body: string;
  recipient?: Recipient;
  offer: string;
  business: string;
}) {
  return (
    <aside className="message-preview" aria-label="Vista previa del mensaje">
      <span className="eyebrow">VISTA PREVIA · SIN ENVIAR</span>
      <strong>{recipient?.name ?? "Elegí un destinatario"}</strong>
      <p>
        {renderMessage(body, {
          nombre: recipient?.name ?? "Nombre del cliente",
          gimnasio: business,
          actividad: recipient?.activities ?? "Actividad",
          vencimiento: recipient?.lastEnd
            ? dateLabel(recipient.lastEnd)
            : "Sin cuota mensual",
          saldo: money(recipient?.balance ?? 0, "ARS"),
          oferta: offer,
        })}
      </p>
      <small>Un mensaje privado por persona. No se crea un grupo.</small>
    </aside>
  );
}
export function RecipientPicker({
  recipients,
  channel,
  segment,
  today,
  selected,
  onChange,
}: {
  recipients: Recipient[];
  channel: Channel;
  segment: "selected" | "recovery";
  today: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const visible = recipients.filter((c) =>
    `${c.name} ${c.phone} ${c.instagram}`
      .toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es")),
  );
  const eligible = visible.filter(
    (c) => !recipientReason(c, channel, segment, today),
  );
  return (
    <fieldset className="campaign-recipients">
      <legend>Destinatarios · {selected.length} seleccionados</legend>
      <label htmlFor={id}>Buscar por nombre, celular o Instagram</label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="communication-tools">
        <button
          type="button"
          className="text-action"
          onClick={() =>
            onChange(
              [...new Set([...selected, ...eligible.map((c) => c.id)])].slice(
                0,
                500,
              ),
            )
          }
        >
          Seleccionar habilitados
        </button>
        <button
          className="text-action"
          type="button"
          onClick={() => onChange([])}
        >
          Limpiar selección
        </button>
      </div>
      <div className="recipient-scroll">
        {visible.length ? (
          visible.map((c) => {
            const reason = recipientReason(c, channel, segment, today);
            return (
              <label className="campaign-person" key={c.id}>
                <input
                  type="checkbox"
                  name="customers"
                  value={c.id}
                  disabled={
                    !!reason ||
                    (!selected.includes(c.id) && selected.length >= 500)
                  }
                  checked={selected.includes(c.id) && !reason}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, c.id]
                        : selected.filter((v) => v !== c.id),
                    )
                  }
                />
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {channel === "whatsapp"
                      ? c.phone || "Sin celular"
                      : c.instagram || "Sin Instagram"}{" "}
                    ·{" "}
                    {c.lastEnd
                      ? `${c.lastEnd < today ? "Venció" : "Vence"} ${dateLabel(c.lastEnd)}`
                      : "Sin cuota mensual"}
                  </small>
                  <small>
                    {reason ??
                      `Habilitado para preparar · ${money(c.balance, "ARS")} pendientes`}
                  </small>
                </span>
              </label>
            );
          })
        ) : (
          <p className="daily-empty">
            No encontramos clientes con esa búsqueda.
          </p>
        )}
      </div>
    </fieldset>
  );
}
export function CampaignComposer({
  templates,
  recipients,
  today,
  business,
  requestId,
}: {
  templates: Template[];
  recipients: Recipient[];
  today: string;
  business: string;
  requestId: string;
}) {
  const channel: Channel = "whatsapp";
  const [segment, setSegment] = useState<"selected" | "recovery">("selected");
  const first =
    templates.find(
      (t) => t.channel === "whatsapp" && t.purpose === "general",
    ) ??
    templates.find((t) => t.channel === "whatsapp" && t.purpose === "recovery");
  const [templateId, setTemplateId] = useState(first?.id ?? ""),
    [body, setBody] = useState(first?.body ?? ""),
    [offer, setOffer] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [schedule, setSchedule] = useState(""),
    [previewId, setPreviewId] = useState("");
  const eligibleSelected = selected.filter((id) => {
    const c = recipients.find((r) => r.id === id);
    return c && !recipientReason(c, channel, segment, today);
  });
  const available = templates.filter(
    (t) =>
      t.channel === channel &&
      (t.purpose === segment ||
        t.purpose === "general" ||
        (segment === "selected" && t.purpose === "recovery")),
  );
  return (
    <CommunicationForm
      operation="campaign"
      requestId={requestId}
      label={`Preparar ${eligibleSelected.length || "los"} mensajes privados`}
    >
      <div className="operation-grid">
        <label>
          Nombre de la lista
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue="Mensaje a clientes"
          />
        </label>
        <input type="hidden" name="channel" value="whatsapp" />
      </div>
      <label>
        ¿A quién querés escribirle?
        <select
          name="segment"
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value as typeof segment);
            setSelected([]);
          }}
        >
          <option value="recovery">Sin cuota desde hace 2 meses o más</option>
          <option value="selected">Clientes elegidos por mí</option>
        </select>
      </label>
      <p className="muted">
        {segment === "recovery"
          ? "Los dos meses se cuentan desde el vencimiento de la última cuota. La deuda anterior se conserva."
          : "Elegí uno o varios clientes de la lista. Cada persona recibe un mensaje privado."}{" "}
        Para ofertas hace falta autorización del cliente por WhatsApp.
      </p>
      <label>
        Plantilla
        <select
          name="templateId"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setBody(templates.find((t) => t.id === e.target.value)?.body ?? "");
          }}
        >
          {available.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Oferta para esta campaña (opcional)
        <input
          name="offer"
          maxLength={500}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Ej.: Consultá por el plan de regreso"
        />
      </label>
      <label>
        Mensaje personalizado
        <textarea
          name="body"
          required
          minLength={5}
          maxLength={1500}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <p className="muted">
        Variables: {purposeVariables.general.map((v) => `{${v}}`).join(" · ")}
      </p>
      <details className="operation-panel">
        <summary>Preparar para otra fecha (opcional)</summary>
        <p>
          Se habilita la apertura desde esa fecha. El envío se confirma en
          WhatsApp.
        </p>
        <div className="operation-grid">
          <label>
            Fecha prevista (opcional, hora Argentina)
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              min={`${today}T00:00`}
            />
          </label>
          <input
            type="hidden"
            name="scheduledFor"
            value={schedule ? `${schedule}:00-03:00` : ""}
          />
        </div>
      </details>
      <RecipientPicker
        recipients={recipients}
        today={today}
        channel={channel}
        segment={segment}
        selected={eligibleSelected}
        onChange={setSelected}
      />
      {eligibleSelected.length > 1 ? (
        <label>
          Revisar mensaje de
          <select
            value={
              eligibleSelected.includes(previewId)
                ? previewId
                : eligibleSelected[0]
            }
            onChange={(e) => setPreviewId(e.target.value)}
          >
            {eligibleSelected.map((id) => (
              <option key={id} value={id}>
                {recipients.find((r) => r.id === id)?.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Preview
        body={body}
        recipient={recipients.find(
          (c) =>
            c.id ===
            (eligibleSelected.includes(previewId)
              ? previewId
              : eligibleSelected[0]),
        )}
        offer={offer}
        business={business}
      />
      <p className="muted">
        Preparar guarda una copia por destinatario. En WhatsApp podés abrir cada
        chat desde Listos para abrir y confirmar el envío.
      </p>
    </CommunicationForm>
  );
}
export function TemplateEditor({ template }: { template?: Template }) {
  const [purpose, setPurpose] = useState<Purpose>(
    (template?.purpose as Purpose) ?? "general",
  );
  return (
    <CommunicationForm
      operation="template"
      id={template?.id}
      revision={template?.revision}
      label={template ? "Guardar plantilla" : "Crear plantilla"}
    >
      <label>
        Nombre
        <input
          name="title"
          required
          minLength={2}
          maxLength={100}
          defaultValue={template?.title}
        />
      </label>
      <div className="operation-grid">
        <label>
          Canal
          <select name="channel" defaultValue={template?.channel ?? "whatsapp"}>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram" disabled={purpose === "expense"}>
              Instagram
            </option>
          </select>
        </label>
        <label>
          Uso
          <select
            name="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as Purpose)}
          >
            <option value="general">Novedades</option>
            <option value="recovery">Regreso al gimnasio</option>
            <option value="expense">Boletas a dueños</option>
          </select>
        </label>
      </div>
      <label>
        Mensaje
        <textarea
          name="body"
          required
          minLength={5}
          maxLength={1500}
          rows={5}
          defaultValue={template?.body}
        />
      </label>
      <p className="muted">
        Variables disponibles:{" "}
        {purposeVariables[purpose].map((v) => `{${v}}`).join(" · ")}. Una
        plantilla usada por una regla debe conservar su canal y uso.
      </p>
    </CommunicationForm>
  );
}
export function RuleEditor({
  rule,
  templates,
  recipients,
  selectedIds,
  today,
}: {
  rule: Tables<"communication_rules">;
  templates: Template[];
  recipients: Recipient[];
  selectedIds: string[];
  today: string;
}) {
  const recovery = rule.kind === "recovery";
  const [channel, setChannel] = useState<Channel>(rule.channel as Channel),
    [audience, setAudience] = useState(rule.audience),
    [selected, setSelected] = useState(selectedIds);
  const available = templates.filter(
    (t) => t.purpose === rule.kind && t.channel === channel,
  );
  const [template, setTemplate] = useState(rule.template_id ?? "");
  return (
    <CommunicationForm
      operation="rule"
      revision={rule.revision}
      label="Guardar regla"
    >
      <input type="hidden" name="kind" value={rule.kind} />
      <label className="operation-check">
        <input type="checkbox" name="enabled" defaultChecked={rule.enabled} />
        Habilitar la preparación de esta regla
      </label>
      <div className="operation-grid">
        <label>
          Canal
          <select
            name="channel"
            value={channel}
            onChange={(e) => {
              const next = e.target.value as Channel;
              setChannel(next);
              setTemplate(
                templates.find(
                  (t) => t.purpose === rule.kind && t.channel === next,
                )?.id ?? "",
              );
            }}
          >
            {recovery ? (
              <>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </>
            ) : (
              <option value="whatsapp">WhatsApp</option>
            )}
          </select>
        </label>
        <label>
          Plantilla
          <select
            name="templateId"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            required
          >
            {available.map((t) => (
              <option value={t.id} key={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hora prevista en Argentina
          <input
            name="sendHour"
            type="number"
            min={0}
            max={23}
            required
            defaultValue={rule.send_hour}
          />
        </label>
      </div>
      {recovery ? (
        <>
          <label>
            Oferta
            <input name="offer" maxLength={500} defaultValue={rule.offer} />
          </label>
          <label>
            Destinatarios
            <select
              name="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="selected">Solo clientes seleccionados</option>
              <option value="all_eligible">
                Todos los que cumplan las condiciones
              </option>
            </select>
          </label>
          {audience === "selected" ? (
            <RecipientPicker
              recipients={recipients}
              channel={channel}
              segment="selected"
              today={today}
              selected={selected}
              onChange={setSelected}
            />
          ) : null}
          <p className="muted">
            La regla espera hasta los dos meses calendario desde el vencimiento.
            No renueva cuotas ni perdona deudas.
          </p>
          <input type="hidden" name="daysBefore" value={rule.days_before} />
          <input type="hidden" name="overdueEvery" value={rule.overdue_every} />
        </>
      ) : (
        <>
          <input type="hidden" name="audience" value="selected" />
          <label className="operation-check">
            <input
              type="checkbox"
              name="notifyBefore"
              defaultChecked={rule.notify_before}
            />
            Avisar antes del vencimiento
          </label>
          <label>
            Días antes
            <input
              type="number"
              name="daysBefore"
              min={1}
              max={30}
              required
              defaultValue={rule.days_before}
            />
          </label>
          <label className="operation-check">
            <input
              type="checkbox"
              name="notifyOnDue"
              defaultChecked={rule.notify_on_due}
            />
            Avisar el día del vencimiento
          </label>
          <label className="operation-check">
            <input
              type="checkbox"
              name="notifyOverdue"
              defaultChecked={rule.notify_overdue}
            />
            Repetir mientras siga pendiente
          </label>
          <label>
            Repetir cada cuántos días (desde el primer día vencido)
            <input
              name="overdueEvery"
              type="number"
              min={1}
              max={30}
              required
              defaultValue={rule.overdue_every}
            />
          </label>
          <label className="operation-check">
            <input
              type="checkbox"
              name="recurringOnly"
              defaultChecked={rule.recurring_only}
            />
            Solo boletas de gastos recurrentes
          </label>
          <p className="muted">
            Se prepara un mensaje privado para cada dueño activo. Los pagos
            parciales actualizan el saldo; con saldo cero dejan de prepararse
            avisos.
          </p>
        </>
      )}
    </CommunicationForm>
  );
}
