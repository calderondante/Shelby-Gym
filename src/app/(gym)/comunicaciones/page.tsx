import Link from "next/link";
import { redirect } from "next/navigation";
import { uuid } from "@/features/gym/validation/contracts";
import { communicationSection } from "@/features/communications/domain/sections";
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
export const metadata = { title: "Mensajes" };
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
  const section = communicationSection(params.seccion);
  if (section === "duenos") redirect("/avisos");
  const data = await getCommunications(section, campaignId);
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
        eyebrow="WHATSAPP DEL GIMNASIO"
        title="Mensajes"
        description="Elegí los clientes, prepará el texto y confirmá cada envío en WhatsApp."
      />
      <div className="workflow-guide">
        <strong>
          1. Elegí clientes → 2. Prepará el mensaje → 3. Abrí WhatsApp
        </strong>
        <p>
          Se usa la cuenta de WhatsApp iniciada en este celular o PC. Vos
          confirmás cada envío; no hace falta conectar una API.
        </p>
        <Link href="/avisos">
          Avisos para vos, incluso con la app cerrada →
        </Link>
      </div>
      <nav className="communication-tabs" aria-label="Secciones de mensajes">
        <Link
          href="/comunicaciones?seccion=campanas"
          aria-current={section === "campanas" ? "page" : undefined}
        >
          Preparar mensaje
        </Link>
        <Link
          href="/comunicaciones?seccion=historial"
          aria-current={section === "historial" ? "page" : undefined}
        >
          Listos para abrir
        </Link>
        <Link
          href="/comunicaciones?seccion=plantillas"
          aria-current={
            ["plantillas", "automatizaciones", "canales"].includes(section)
              ? "page"
              : undefined
          }
        >
          Ajustes
        </Link>
      </nav>
      {["plantillas", "automatizaciones", "canales"].includes(section) ? (
        <nav className="operation-tabs" aria-label="Ajustes de mensajes">
          <Link
            href="/comunicaciones?seccion=plantillas"
            aria-current={section === "plantillas" ? "page" : undefined}
          >
            Textos guardados
          </Link>
          <Link
            href="/comunicaciones?seccion=automatizaciones"
            aria-current={section === "automatizaciones" ? "page" : undefined}
          >
            Ofertas de regreso
          </Link>
          <Link
            href="/comunicaciones?seccion=canales"
            aria-current={section === "canales" ? "page" : undefined}
          >
            Datos del gimnasio
          </Link>
        </nav>
      ) : null}
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
      {section === "campanas" && data.config ? (
        <>
          <CampaignComposer
            templates={data.templates}
            recipients={data.recipients}
            business={data.config.business_name}
            today={today}
            requestId={crypto.randomUUID()}
          />
          <details className="operation-panel">
            <summary>Listas de mensajes anteriores</summary>
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
          </details>
        </>
      ) : null}
      {section === "plantillas" ? (
        <section className="operation-section">
          <h2>Textos guardados</h2>
          <p>
            Se personalizan al preparar cada mensaje. Editar una plantilla
            conserva las copias ya preparadas.
          </p>
          {data.templates
            .filter((t) => t.purpose !== "expense")
            .map((t) => (
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
          <h2>Ofertas para volver al gimnasio</h2>
          <p>
            Usá «Preparar ofertas de hoy» para preparar los recordatorios.
            Después abrí cada chat desde Listos para abrir y confirmá el envío
            en WhatsApp.
          </p>
          <p>
            Los vencimientos de facturas y cuotas se administran en{" "}
            <Link href="/avisos">Avisos del gimnasio</Link>. Las ofertas a
            clientes se confirman una por una en WhatsApp.
          </p>
          {data.rules
            .filter((r) => r.kind === "recovery")
            .map((r) => (
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
          <CommunicationForm
            operation="preview"
            label="Preparar ofertas de hoy"
          >
            <p>
              Revisa los clientes elegidos, sus contactos y autorizaciones.
              Repetir la revisión no duplica el mismo aviso.
            </p>
            <input name="day" type="hidden" value={today} />
          </CommunicationForm>
        </section>
      ) : null}
      {section === "canales" && data.config ? (
        <>
          <p className="workflow-guide">
            WhatsApp funciona con la cuenta abierta en tu dispositivo. Estos
            datos son de referencia; no cambian la cuenta que envía.
          </p>
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
              Número exclusivo de WhatsApp (referencia, opcional)
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
          <details className="operation-panel">
            <summary>¿Y los mensajes de Instagram?</summary>
            <p>
              Podés guardar el @ del gimnasio y de cada cliente. La conexión
              para enviar desde Instagram todavía no está disponible.
            </p>
          </details>
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
