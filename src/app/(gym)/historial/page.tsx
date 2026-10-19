import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, ReceiptText } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { getDailyLedger } from "@/features/gym/server/daily-ledger";
import { requireSettings } from "@/features/gym/server/session";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
import { money } from "@/features/gym/domain/money";
import { paymentMethods } from "@/features/gym/validation/contracts";

export const metadata = { title: "Historial general" };

function shifted(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function GymHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const settings = await requireSettings();
  const today = todayIn(settings.time_zone);
  const requestedDay = (await searchParams).dia;
  const day = validDay(requestedDay) ? requestedDay : today;
  const { payments, periods, names, customers, events } = await getDailyLedger(day, settings.time_zone);
  const byMethod = { transfer: 0, mercado_pago: 0, cash: 0 };
  for (const batch of payments)
    for (const entry of batch.payment_entries)
      if (entry.method in byMethod)
        byMethod[entry.method as keyof typeof byMethod] += entry.amount_cents;
  const received = Object.values(byMethod).reduce((sum, value) => sum + value, 0);

  return (
    <>
      <PageHeading
        eyebrow="CAJA Y MOVIMIENTOS"
        title="Historial general"
        description="Toda la actividad del gimnasio, día por día. Los ingresos incluyen sólo pagos registrados."
      />
      <div className="daily-date-bar">
        <div>
          <span className="eyebrow">FECHA SELECCIONADA</span>
          <h2>{dateLabel(day)}</h2>
        </div>
        <div className="daily-date-actions">
          <Link href={`/historial?dia=${shifted(day, -1)}`} aria-label="Día anterior"><ArrowLeft size={18} /></Link>
          <form action="/historial" className="daily-date-form">
            <label className="sr-only" htmlFor="ledger-day">Elegir día</label>
            <input id="ledger-day" name="dia" type="date" defaultValue={day} />
            <button type="submit" aria-label="Mostrar día"><CalendarDays size={17} /></button>
          </form>
          <Link href={`/historial?dia=${shifted(day, 1)}`} aria-label="Día siguiente"><ArrowRight size={18} /></Link>
          {day !== today && <Link className="daily-today" href="/historial">Hoy</Link>}
        </div>
      </div>
      <section className="daily-summary" aria-label="Ingresos del día">
        <div className="daily-received">
          <span>INGRESÓ EN CAJA</span>
          <strong>{money(received, settings.currency)}</strong>
          <small>{payments.length} {payments.length === 1 ? "abono registrado" : "abonos registrados"}</small>
        </div>
        <dl className="daily-methods">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method}>
              <dt>{paymentMethods[method as keyof typeof paymentMethods]}</dt>
              <dd>{money(amount, settings.currency)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="daily-section" aria-labelledby="daily-payments">
        <div className="daily-section-heading">
          <div><span className="eyebrow">DINERO RECIBIDO</span><h2 id="daily-payments">Abonos</h2></div>
          <span>{payments.length}</span>
        </div>
        {payments.length ? (
          <ol className="daily-list">
            {payments.map((batch) => {
              const total = batch.payment_entries.reduce((sum, entry) => sum + entry.amount_cents, 0);
              const subscription = batch.subscriptions;
              return <li key={batch.id}>
                <Link href={`/clientes/${subscription.customer_id}/historial`}>
                  <div className="daily-entry-main">
                    <strong>{subscription.customers?.name ?? "Cliente"}</strong>
                    <span>{subscription.activity_name} · cuota {dateLabel(subscription.starts_on)}–{dateLabel(subscription.ends_on)}{batch.import_batch_id ? " · histórico importado" : ""}</span>
                    <small>{batch.payment_entries.map((entry) => `${paymentMethods[entry.method as keyof typeof paymentMethods] ?? entry.method}: ${money(entry.amount_cents, subscription.currency)}`).join(" · ")}</small>
                  </div>
                  <strong className="daily-entry-amount">+ {money(total, subscription.currency)}</strong>
                </Link>
              </li>;
            })}
          </ol>
        ) : <div className="daily-empty"><ReceiptText size={22} aria-hidden="true" /><p>No hay abonos registrados este día.</p></div>}
      </section>
      <section className="daily-section" aria-labelledby="daily-periods">
        <div className="daily-section-heading">
          <div><span className="eyebrow">ACTIVIDAD, NO INGRESOS</span><h2 id="daily-periods">Cuotas registradas</h2></div>
          <span>{periods.length}</span>
        </div>
        <p className="daily-section-note">El precio de una cuota no se suma a caja. Su saldo indica lo que falta cobrar hoy.</p>
        {periods.length ? (
          <ol className="daily-list">
            {periods.map((period) => <li key={period.id}>
              <Link href={`/clientes/${period.customer_id}`}>
                <div className="daily-entry-main">
                  <strong>{names.get(period.customer_id ?? "") ?? "Cliente"}</strong>
                  <span>{period.activity_name} · cuota de {money(period.total_cents ?? 0, period.currency ?? settings.currency)}</span>
                  <small>Vigencia: {dateLabel(period.starts_on!)} al {dateLabel(period.ends_on!)}</small>
                </div>
                <span className="daily-period-balance">Saldo actual<br /><strong>{money(period.balance_cents ?? 0, period.currency ?? settings.currency)}</strong></span>
              </Link>
            </li>)}
          </ol>
        ) : <div className="daily-empty"><p>No se registraron cuotas este día.</p></div>}
      </section>
      <section className="daily-section" aria-labelledby="daily-profiles">
        <div className="daily-section-heading">
          <div><span className="eyebrow">CAMBIOS DEL PADRÓN</span><h2 id="daily-profiles">Perfiles</h2></div>
          <span>{customers.length + events.length}</span>
        </div>
        {customers.length || events.length ? (
          <ol className="daily-list">
            {customers.map((customer) => <li key={customer.id}>
              <Link href={`/clientes/${customer.id}/historial`}>
                <div className="daily-entry-main"><strong>{customer.name}</strong><span>Perfil creado</span></div>
              </Link>
            </li>)}
            {events.map((event) => <li key={event.id}>
              <Link href={`/clientes/${event.customer_id}/historial`}>
                <div className="daily-entry-main"><strong>{event.customers?.name ?? "Cliente"}</strong><span>{event.event === "retired" ? "Perfil retirado" : event.event === "inactive" ? "Baja registrada" : "Cliente reactivado"}</span></div>
              </Link>
            </li>)}
          </ol>
        ) : <div className="daily-empty"><p>No hubo cambios de perfiles este día.</p></div>}
      </section>
    </>
  );
}
