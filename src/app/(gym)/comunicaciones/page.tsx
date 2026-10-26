import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { getCommunications } from "@/features/communications/server/data";
import {
  CampaignComposer,
  CommunicationForm,
  RuleEditor,
  TemplateEditor,
} from "@/features/communications/components/forms";
import { todayIn } from "@/features/gym/domain/dates";
export const metadata = { title: "Comunicaciones" };
const sections = [
  { id: "campanas", label: "Campañas" },
  { id: "plantillas", label: "Plantillas" },
  { id: "automatizaciones", label: "Automatizaciones" },
  { id: "duenos", label: "Dueños" },
  { id: "canales", label: "Canales" },
  { id: "historial", label: "Preparados" },
];
export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string; guardado?: string }>;
}) {
  const [data, params] = await Promise.all([getCommunications(), searchParams]);
  const section = sections.some((s) => s.id === params.seccion)
    ? params.seccion
    : "campanas";
  const today = todayIn(data.gym.time_zone);
  const timestamp = (value: string) =>
    new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: data.gym.time_zone,
    }).format(new Date(value));
  return (
    <>
      <PageHeading
        eyebrow="RELACIÓN CON EL GIMNASIO"
        title="Comunicaciones"
        description="Mensajes personales, ofertas para volver y boletas en orden."
      />
      <p className="notice">
        WhatsApp e Instagram pendientes de conectar. Todo se guarda como
        preparado, sin enviar. Las reglas no se ejecutan en segundo plano
        todavía.
      </p>
      <nav
        className="communication-tabs"
        aria-label="Secciones de comunicaciones"
      >
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`/comunicaciones?seccion=${s.id}`}
            aria-current={section === s.id ? "page" : undefined}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      {params.guardado ? (
        <p className="notice" role="status">
          Cambios guardados. No se enviaron mensajes.
        </p>
      ) : null}
      {section === "campanas" ? (
        <>
          <CampaignComposer
            templates={data.templates}
            recipients={data.recipients}
            business={data.config.business_name}
            today={today}
            requestId={crypto.randomUUID()}
          />
          <section className="operation-section">
            <h2>Campañas guardadas</h2>
            {data.campaigns.length ? (
              data.campaigns.map((c) => (
                <article className="operation-panel" key={c.id}>
                  <div className="operation-entry">
                    <h3>{c.title}</h3>
                    <span>
                      {c.status === "draft"
                        ? "Borrador anterior"
                        : c.status === "cancelled"
                          ? "Cancelada"
                          : "Preparada"}{" "}
                      · {c.campaign_recipients.length} personas
                    </span>
                  </div>
                  <p className="campaign-message">{c.message}</p>
                  <small>{timestamp(c.created_at)} · sin enviar</small>
                </article>
              ))
            ) : (
              <p className="daily-empty">
                Tu primera campaña empieza eligiendo a quién querés escribirle.
              </p>
            )}
          </section>
        </>
      ) : null}
      {section === "plantillas" ? (
        <section className="operation-section">
          <h2>Mensajes con la voz de Shelby</h2>
          <p>
            Se personalizan al preparar cada mensaje. Editar una plantilla
            conserva las copias ya preparadas.
          </p>
          {data.templates.map((t) => (
            <details className="communication-details" key={t.id}>
              <summary>
                {t.title}
                <small>
                  {t.channel === "whatsapp" ? "WhatsApp" : "Instagram"}
                </small>
              </summary>
              <TemplateEditor template={t} />
            </details>
          ))}
          <details className="communication-details">
            <summary>Crear una plantilla</summary>
            <TemplateEditor />
          </details>
        </section>
      ) : null}
      {section === "automatizaciones" ? (
        <section className="operation-section">
          <h2>Reglas de preparación</h2>
          <p>
            Configurá los mensajes ahora. Hasta conectar los canales y activar
            un servicio programado, usá «Revisar avisos de hoy» para generar las
            propuestas sin enviarlas.
          </p>
          {data.rules.map((r) => (
            <section className="operation-panel" key={r.kind}>
              <h3>
                {r.kind === "recovery"
                  ? "Regreso después de dos meses"
                  : "Boletas para los dueños"}
              </h3>
              <RuleEditor
                rule={r}
                templates={data.templates}
                recipients={data.recipients}
                today={today}
                selectedIds={data.selections
                  .filter((s) => s.rule_kind === r.kind)
                  .map((s) => s.customer_id)}
              />
            </section>
          ))}
          <CommunicationForm operation="preview" label="Revisar avisos de hoy">
            <p>
              Revisa vencimientos, autorizaciones, contactos activos y saldos.
              Repetir la revisión no duplica el mismo aviso.
            </p>
            <input name="day" type="hidden" value={today} />
          </CommunicationForm>
        </section>
      ) : null}
      {section === "duenos" ? (
        <section className="operation-section">
          <h2>¿Quién recibe las boletas?</h2>
          <p>
            Estos contactos recibirán avisos privados cuando se conecte
            WhatsApp. No se usan para contactar clientes.
          </p>
          {data.owners.map((o) => (
            <details className="communication-details" key={o.id}>
              <summary>
                {o.name}
                <small>
                  {o.active ? "Activo" : "Desactivado"} · {o.phone}
                </small>
              </summary>
              <CommunicationForm
                operation="owner"
                id={o.id}
                revision={o.revision}
                label="Guardar contacto"
              >
                <label>
                  Nombre
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={o.name}
                  />
                </label>
                <label>
                  Celular internacional
                  <input
                    name="phone"
                    type="tel"
                    required
                    defaultValue={o.phone}
                  />
                </label>
                <label className="operation-check">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={o.active}
                  />
                  Recibir avisos
                </label>
              </CommunicationForm>
            </details>
          ))}
          <CommunicationForm operation="owner" label="Agregar dueño">
            <label>
              Nombre
              <input name="name" required minLength={2} maxLength={100} />
            </label>
            <label>
              Celular internacional
              <input name="phone" type="tel" placeholder="+54…" required />
            </label>
            <label className="operation-check">
              <input type="checkbox" name="active" defaultChecked />
              Recibir avisos
            </label>
          </CommunicationForm>
        </section>
      ) : null}
      {section === "canales" ? (
        <>
          <div className="operation-grid">
            <article className="operation-panel">
              <h2>WhatsApp</h2>
              <p>Pendiente de vincular</p>
              <small>
                Número exclusivo, cuenta de empresa y plantillas aprobadas para
                iniciar conversaciones. La conexión se hará del lado del
                servidor.
              </small>
            </article>
            <article className="operation-panel">
              <h2>Instagram</h2>
              <p>Pendiente de vincular</p>
              <small>
                Requiere cuenta profesional y conversación iniciada por el
                cliente. Su @ por sí solo no permite enviar mensajes mediante la
                API oficial.
              </small>
            </article>
          </div>
          <CommunicationForm
            operation="config"
            revision={data.config.revision}
            label="Guardar datos del gimnasio"
          >
            <label>
              Nombre del gimnasio
              <input
                name="businessName"
                defaultValue={data.config.business_name}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Número exclusivo de WhatsApp (opcional)
              <input
                name="whatsappPhone"
                type="tel"
                defaultValue={data.config.whatsapp_phone}
                placeholder="Completar cuando esté disponible"
              />
            </label>
            <label>
              Instagram del gimnasio (opcional)
              <input
                name="instagramHandle"
                defaultValue={data.config.instagram_handle}
                placeholder="@shelby.gymm"
                maxLength={31}
              />
            </label>
            <p className="muted">
              Guardar estos datos no conecta las cuentas. No pegues contraseñas
              ni tokens aquí.
            </p>
          </CommunicationForm>
        </>
      ) : null}
      {section === "historial" ? (
        <section className="operation-section">
          <div className="operation-entry">
            <h2>Mensajes preparados</h2>
            <span>Últimos 200</span>
          </div>
          <p>
            Cada fila representa un mensaje privado. «Preparado» nunca significa
            enviado ni entregado.
          </p>
          {data.outbox.length ? (
            data.outbox.map((m) => (
              <article className="operation-panel" key={m.id}>
                <div className="operation-entry">
                  <h3>{m.recipient_name}</h3>
                  <strong>
                    {m.status === "cancelled"
                      ? "Cancelado"
                      : "Preparado · Sin enviar"}
                  </strong>
                </div>
                <small>
                  {m.channel === "whatsapp" ? "WhatsApp" : "Instagram"} ·{" "}
                  {m.destination} · {timestamp(m.scheduled_for)}
                </small>
                <p className="campaign-message">{m.body}</p>
                <small>
                  {m.source === "expense"
                    ? "Boleta a dueño"
                    : m.source === "recovery"
                      ? "Regla de regreso"
                      : "Campaña"}{" "}
                  · {m.note}
                </small>
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
            ))
          ) : (
            <p className="daily-empty">
              Todavía no hay mensajes preparados. Podés crear una campaña o
              revisar las reglas de hoy.
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
