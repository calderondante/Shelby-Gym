import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getCustomer, getPayments } from "@/features/gym/server/data";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { CustomerLifecycle } from "@/features/gym/components/customer-lifecycle";
import { money } from "@/features/gym/domain/money";
import { dateLabel, todayIn, validity } from "@/features/gym/domain/dates";
import { paymentMethods } from "@/features/gym/validation/contracts";
export const metadata = { title: "Perfil del cliente" };
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { id } = await params;
  const [{ customer, subscriptions }, settings, query, { staff }] = await Promise.all([
    getCustomer(id),
    requireSettings(),
    searchParams,
    requireStaff(),
  ]);
  const payments = await getPayments(id);
  const balance = subscriptions.reduce(
    (sum, s) => sum + (s.balance_cents ?? 0),
    0,
  );
  const today = todayIn(settings.time_zone);
  return (
    <>
      <PageHeading
        eyebrow="PERFIL DEL CLIENTE"
        title={customer.name}
        back={{ href: "/clientes", label: "Clientes" }}
        action={<div className="heading-actions">
          <Link href={`/clientes/${id}/historial`} className={buttonVariants({ variant: "outline" })}>Historial</Link>
          <Link href={`/clientes/${id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar perfil</Link>
        </div>}
      />
      {["alta", "pago", "perfil", "estado"].includes(query.guardado ?? "") ? (
        <Alert role="status" className="mb-6">
          <AlertTitle>Guardado correctamente</AlertTitle>
          <AlertDescription>
            {query.guardado === "pago"
              ? "El abono quedó registrado. El vencimiento no cambió."
              : query.guardado === "alta"
                ? "La suscripción y el primer abono quedaron registrados."
                : query.guardado === "estado"
                  ? "El estado del perfil quedó actualizado. Sus cuotas y pagos se conservan."
                  : "Los datos del cliente están actualizados."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="profile-overview">
        <div>
          <p className="eyebrow">SALDO TOTAL PENDIENTE</p>
          <strong
            className={
              balance > 0 ? "profile-total debt-amount" : "profile-total"
            }
          >
            {money(balance, settings.currency)}
          </strong>
          <p className="muted">
            {balance > 0
              ? "Suma de los períodos con saldo, vigentes o vencidos."
              : "Todas las cuotas están al día."}
          </p>
        </div>
        <dl className="contact-details">
          <div>
            <dt>Teléfono</dt>
            <dd>{customer.phone || "Sin registrar"}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{customer.email || "Sin registrar"}</dd>
          </div>
          {customer.age_years !== null ? (
            <div>
              <dt>Edad registrada</dt>
              <dd>
                {customer.age_years} años · al {dateLabel(customer.age_as_of!)}
              </dd>
            </div>
          ) : null}
          {customer.notes ? (
            <div>
              <dt>Nota de recepción</dt>
              <dd>{customer.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      {customer.status !== "active" ? (
        <Alert className="mb-6">
          <AlertTitle>{customer.status === "retired" ? "Perfil retirado" : "Cliente dado de baja"}</AlertTitle>
          <AlertDescription>Los pagos y saldos anteriores permanecen en el historial. Al volver, la cuota nueva comienza con el primer abono de ese día.</AlertDescription>
        </Alert>
      ) : null}
      <div className="section-title">
        <h2>Suscripciones y cuotas</h2>
        <Link
          href={`/clientes/${id}/inscribir`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Nuevo período o actividad
        </Link>
      </div>
      {!subscriptions.length ? (
        <p className="muted">
          Este cliente todavía no tiene períodos registrados. Podés asignarle
          una actividad desde acá.
        </p>
      ) : null}
      <div className="subscription-list">
        {subscriptions.map((s) => (
          <article className="subscription" key={s.id}>
            <div className="subscription-header">
              <div>
                <h3>{s.activity_name}</h3>
                <p className="muted">
                  {dateLabel(s.starts_on!)} → {dateLabel(s.ends_on!)}
                </p>
                {s.offer_label ? <small>{s.offer_label}</small> : null}
              </div>
              <Badge variant="outline">
                {validity(s.starts_on!, s.ends_on!, today)}
              </Badge>
            </div>
            <dl className="ledger-totals">
              <div>
                <dt>Cuota</dt>
                <dd>{money(s.total_cents!, s.currency!)}</dd>
              </div>
              <div>
                <dt>Abonado</dt>
                <dd>{money(s.paid_cents!, s.currency!)}</dd>
              </div>
              <div>
                <dt>Pendiente</dt>
                <dd className={(s.balance_cents ?? 0) > 0 ? "debt-amount" : ""}>
                  {money(s.balance_cents!, s.currency!)}
                </dd>
              </div>
            </dl>
            {(s.balance_cents ?? 0) > 0 ? (
              <Link
                className={buttonVariants()}
                href={`/clientes/${id}/abonar?cuota=${s.id}`}
              >
                Registrar abono
              </Link>
            ) : (
              <p className="paid-label">✓ Cuota completa</p>
            )}
            {s.import_batch_id ? (
              <p className="import-origin">
                Cuota histórica importada. Su precio original se conserva.
                {(s.opening_paid_cents ?? 0) > 0
                  ? ` Incluye ${money(s.opening_paid_cents!, s.currency!)} abonados antes de la app sin detalle de pagos.`
                  : ""}
              </p>
            ) : null}
            <details className="payment-history">
              <summary>Historial de abonos</summary>
              {!payments.some((p) => p.subscription_id === s.id) ? (
                <p className="muted">
                  No hay abonos detallados para este período.
                </p>
              ) : null}
              <ol>
                {payments
                  .filter((p) => p.subscription_id === s.id)
                  .sort((a, b) =>
                    (b.occurred_on ?? b.created_at.slice(0, 10)).localeCompare(
                      a.occurred_on ?? a.created_at.slice(0, 10),
                    ),
                  )
                  .map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>
                          {p.occurred_on
                            ? dateLabel(p.occurred_on)
                            : new Intl.DateTimeFormat("es-AR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: settings.time_zone,
                              }).format(new Date(p.created_at))}
                        </strong>
                        <small>
                          {p.import_batch_id
                            ? "Pago histórico · importado por "
                            : "Registrado por "}
                          {p.staff?.name ?? "Personal"}
                        </small>
                      </div>
                      <ul>
                        {p.payment_entries.map((e, i) => (
                          <li key={i}>
                            <span>
                              {
                                paymentMethods[
                                  e.method as keyof typeof paymentMethods
                                ]
                              }
                            </span>
                            <strong>
                              {money(e.amount_cents, s.currency!)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
      <CustomerLifecycle
        id={id}
        revision={customer.revision}
        name={customer.name}
        status={customer.status === "retired" ? "retired" : customer.status === "inactive" ? "inactive" : "active"}
        canRetire={staff.role === "owner"}
        currentPeriod={subscriptions.some((s) => s.starts_on! <= today && s.ends_on! > today)}
      />
    </>
  );
}
