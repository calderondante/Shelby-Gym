import { PageHeading } from "@/components/shared/page-heading";
import { OperationForm } from "@/features/gym/components/operation-forms";
import { getCampaignData } from "@/features/gym/server/operations";
import { getActivities } from "@/features/gym/server/data";
import { requireSettings } from "@/features/gym/server/session";
import { money } from "@/features/gym/domain/money";
import { dateLabel } from "@/features/gym/domain/dates";
export const metadata = { title: "Campañas" };
export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [{ candidates, campaigns }, activities, settings, params] =
    await Promise.all([
      getCampaignData(),
      getActivities(true),
      requireSettings(),
      searchParams,
    ]);
  return (
    <>
      <PageHeading
        eyebrow="RELACIÓN CON SOCIOS"
        title="Que vuelvan a entrenar"
        description="Socios cuya última cuota venció hace dos meses calendario o más. Elegí a quién ofrecerle un nuevo plan."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <p className="notice">
        WhatsApp todavía no está conectado. Podés preparar la campaña; no se
        envía ningún mensaje. Las ofertas y las deudas anteriores se mantienen
        separadas.
      </p>
      {params.guardado ? (
        <p role="status" className="notice">
          Campaña guardada como borrador. No se enviaron mensajes.
        </p>
      ) : null}
      <OperationForm
        operation="campaign"
        requestId={crypto.randomUUID()}
        label="Guardar campaña preparada"
      >
        <label>
          Nombre de campaña
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ej.: Volvé a Shelby"
          />
        </label>
        <label>
          Plan que querés ofrecer (opcional)
          <select name="activity">
            <option value="">Sin un plan específico</option>
            {activities
              .filter((a) => a.duration_unit !== "sessions")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ·{" "}
                  {money(
                    a.offer_price_cents ?? a.price_cents,
                    settings.currency,
                  )}
                </option>
              ))}
          </select>
        </label>
        <label>
          Mensaje de la campaña
          <textarea
            name="message"
            minLength={5}
            maxLength={1500}
            required
            rows={4}
            defaultValue="¡Hola! Te esperamos en Shelby Gym. Tenemos propuestas para que vuelvas a entrenar. ¿Querés que te contemos?"
          />
        </label>
        <fieldset className="campaign-recipients">
          <legend>Revisá y seleccioná destinatarios</legend>
          {!candidates.length ? (
            <p>No hay socios que cumplan los dos meses desde el vencimiento.</p>
          ) : (
            candidates.map((c) => {
              const enabled = !!c.phone?.trim() && c.marketing_opt_in;
              return (
                <label key={c.id!} className="campaign-person">
                  <input
                    type="checkbox"
                    name="customers"
                    value={c.id!}
                    disabled={!enabled}
                  />
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      Venció {dateLabel(c.last_end!)} ·{" "}
                      {c.phone || "Sin celular"} {c.instagram || ""}
                    </small>
                    <small>
                      {c.balance_cents! > 0
                        ? `Deuda anterior: ${money(c.balance_cents!, settings.currency)}`
                        : "Sin deuda anterior"}
                      {!enabled
                        ? ` · ${!c.marketing_opt_in ? "Sin autorización para promociones" : "Falta celular"}`
                        : ""}
                    </small>
                  </span>
                </label>
              );
            })
          )}
        </fieldset>
      </OperationForm>
      <section className="operation-section">
        <h2>Campañas preparadas</h2>
        {!campaigns.length ? (
          <p className="daily-empty">Todavía no preparaste una campaña.</p>
        ) : (
          campaigns.map((c) => (
            <article key={c.id} className="operation-panel">
              <div className="operation-entry">
                <h3>{c.title}</h3>
                <span>
                  Borrador · {c.campaign_recipients.length} destinatarios
                </span>
              </div>
              <p className="campaign-message">{c.message}</p>
              <small>
                Guardada{" "}
                {new Intl.DateTimeFormat("es-AR", {
                  dateStyle: "medium",
                  timeZone: settings.time_zone,
                }).format(new Date(c.created_at))}{" "}
                · pendiente de conectar WhatsApp
              </small>
            </article>
          ))
        )}
      </section>
    </>
  );
}
