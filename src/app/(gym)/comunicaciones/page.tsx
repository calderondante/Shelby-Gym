import Link from "next/link";
import { uuid } from "@/features/gym/validation/contracts";
import { PageHeading } from "@/components/shared/page-heading";
import { getCommunications } from "@/features/communications/server/data";
import {
  CampaignComposer,
  CommunicationForm,
  RuleEditor,
  TemplateEditor,
} from "@/features/communications/components/forms";
import { PreparedMessages } from "@/features/communications/components/prepared-messages";
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
  searchParams: Promise<{
    seccion?: string;
    guardado?: string;
    aviso?: string;
    campana?: string;
  }>;
}) {
  const params = await searchParams;
  const campaignId = uuid.safeParse(params.campana).success
    ? params.campana
    : undefined;
  const data = await getCommunications(campaignId);
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
        WhatsApp manual disponible: prepará una lista y confirmá cada envío en
        WhatsApp. Los envíos automáticos y la conexión de Instagram siguen
        pendientes.
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
      {params.aviso ? (
        <p className="notice" role="alert">
          {params.aviso === "fecha"
            ? "Todavía no llegó la fecha prevista de este mensaje."
            : params.aviso === "conexion"
              ? "No pudimos comprobar los datos. Revisá la conexión y volvé a intentar; no se abrió WhatsApp."
              : params.aviso === "contacto"
                ? "El contacto o su autorización cambió. Revisá el perfil y prepará un mensaje nuevo."
                : params.aviso === "cambios"
                  ? "Cambió la situación o el contenido del aviso. Prepará una campaña nueva o revisá los avisos de hoy antes de abrir WhatsApp."
                  : "Este mensaje no está disponible para abrir en WhatsApp. Puede estar cancelado o corresponder a otro canal."}
        </p>
      ) : null}
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
                  {c.status === "prepared" ? (
                    <Link
                      className="text-link"
                      href={`/comunicaciones?seccion=historial&campana=${c.id}`}
                    >
                      Revisar mensajes de esta campaña →
                    </Link>
                  ) : null}
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
            Usá «Revisar avisos de hoy» para preparar los recordatorios. Después
            abrí cada chat desde Preparados y confirmá el envío en WhatsApp.
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
            Prepará sus avisos y abrí cada chat en WhatsApp para confirmar el
            envío. No se usan para contactar clientes.
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
              <p>Apertura manual disponible</p>
              <small>
                Abrí los mensajes preparados con la cuenta de WhatsApp que
                tengas iniciada en el dispositivo. El envío manual no utiliza la
                API de Meta.
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
              El número guardado es una referencia: no cambia la cuenta desde la
              que WhatsApp envía. Revisá qué cuenta tenés iniciada antes de
              confirmar. No pegues contraseñas ni tokens aquí.
            </p>
          </CommunicationForm>
        </>
      ) : null}
      {section === "historial" ? (
        <section className="operation-section">
          <div className="operation-entry">
            <h2>Mensajes preparados</h2>
            <span>{campaignId ? "Esta campaña" : "Últimos 200"}</span>
          </div>
          <p>
            Cada fila representa un mensaje privado. «Preparado» nunca significa
            enviado ni entregado.
          </p>
          <p className="notice">
            Se abre WhatsApp del celular o WhatsApp Web en PC. Cada destinatario
            tiene su propio chat; vos confirmás el envío allí. Revisá que estés
            usando la cuenta del gimnasio.
          </p>
          {campaignId ? (
            <Link
              className="text-link"
              href="/comunicaciones?seccion=historial"
            >
              Ver todos los avisos preparados →
            </Link>
          ) : null}
          <PreparedMessages
            messages={data.outbox.map((m) => ({
              ...m,
              scheduledLabel: timestamp(m.scheduled_for),
            }))}
            now={new Date().toISOString()}
          />
        </section>
      ) : null}
    </>
  );
}
