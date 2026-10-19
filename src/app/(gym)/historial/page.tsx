import Link from "next/link";
import { ArrowLeft, ArrowRight, ReceiptText } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { LedgerDayRail, type LedgerDay } from "@/features/gym/components/ledger-day-rail";
import { getMonthlyLedger } from "@/features/gym/server/monthly-ledger";
import { requireSettings } from "@/features/gym/server/session";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
import { daysOfMonth, paymentDay, shiftMonth, sumMethods, validMonth } from "@/features/gym/domain/ledger-calendar";
import { money } from "@/features/gym/domain/money";
import { paymentMethods } from "@/features/gym/validation/contracts";

export const metadata = { title: "Historial general" };

const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function GymHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const settings = await requireSettings();
  const today = todayIn(settings.time_zone);
  const params = await searchParams;
  const month = validMonth(params.mes) ? params.mes
    : typeof params.dia === "string" && validMonth(params.dia.slice(0, 7))
      ? params.dia.slice(0, 7)
      : today.slice(0, 7);
  const { payments, periods, names, customers, events, pendingCents } =
    await getMonthlyLedger(month, settings.time_zone, settings.currency);
  const days = daysOfMonth(month);
  const activity = new Map<string, { count: number; received: number }>();
  function mark(day: string, received = 0) {
    const previous = activity.get(day) ?? { count: 0, received: 0 };
    activity.set(day, { count: previous.count + 1, received: previous.received + received });
  }
  for (const payment of payments)
    mark(paymentDay(payment, settings.time_zone), payment.payment_entries.reduce((sum, line) => sum + line.amount_cents, 0));
  for (const period of periods)
    if (period.created_at) mark(todayIn(settings.time_zone, new Date(period.created_at)));
  for (const customer of customers) mark(todayIn(settings.time_zone, new Date(customer.created_at)));
  for (const event of events) mark(todayIn(settings.time_zone, new Date(event.created_at)));
  const available = days.filter((date) => activity.has(date) && (month !== today.slice(0, 7) || date <= today));
  const selectedDay = typeof params.dia === "string" && days.includes(params.dia)
    ? params.dia
    : available.at(-1) ?? (month === today.slice(0, 7) ? today : days[0]);
  const railDays: LedgerDay[] = days.map((date) => ({
    date,
    number: Number(date.slice(-2)),
    weekday: weekday.format(new Date(`${date}T12:00:00Z`)).replace(".", ""),
    received: activity.get(date)?.received ?? 0,
    hasMovement: activity.has(date),
  }));
  const byMethod = sumMethods(payments);
  const received = Object.values(byMethod).reduce((sum, value) => sum + value, 0);
  const dailyPayments = payments.filter((batch) => paymentDay(batch, settings.time_zone) === selectedDay);
  const dailyPeriods = periods.filter((period) => period.created_at && todayIn(settings.time_zone, new Date(period.created_at)) === selectedDay);
  const dailyCustomers = customers.filter((customer) => todayIn(settings.time_zone, new Date(customer.created_at)) === selectedDay);
  const dailyEvents = events.filter((event) => todayIn(settings.time_zone, new Date(event.created_at)) === selectedDay);
  const dailyReceived = activity.get(selectedDay)?.received ?? 0;
  const titleMonth = monthName.format(new Date(`${month}-01T12:00:00Z`));
  const headingMonth = titleMonth[0].toLocaleUpperCase("es-AR") + titleMonth.slice(1);

  return (
    <>
      <PageHeading
        eyebrow="CAJA Y MOVIMIENTOS"
        title="Historial general"
        description="Elegí un mes y recorré sus días. Las cuotas y las deudas se muestran aparte del dinero cobrado."
      />
      <section className="ledger-month-bar" aria-label="Seleccionar mes">
        <div>
          <span className="eyebrow">MES SELECCIONADO</span>
          <h2>{headingMonth}</h2>
        </div>
        <div className="ledger-month-actions">
          <Link href={`/historial?mes=${shiftMonth(month, -1)}`} aria-label="Mes anterior"><ArrowLeft size={18} /></Link>
          <form action="/historial" className="ledger-month-form">
            <label className="sr-only" htmlFor="ledger-month">Elegir mes</label>
            <input id="ledger-month" name="mes" type="month" defaultValue={month} min="1900-01" max="2100-12" required />
            <button type="submit">Ver mes</button>
          </form>
          <Link href={`/historial?mes=${shiftMonth(month, 1)}`} aria-label="Mes siguiente"><ArrowRight size={18} /></Link>
          {month !== today.slice(0, 7) && <Link className="daily-today" href="/historial">Mes actual</Link>}
        </div>
      </section>
      <section className="ledger-month-summary" aria-label="Resumen financiero">
        <div className="ledger-month-figure">
          <span>COBRADO EN {titleMonth.toLocaleUpperCase("es-AR")}</span>
          <strong>{money(received, settings.currency)}</strong>
          <small>{payments.length} {payments.length === 1 ? "abono registrado" : "abonos registrados"} · efectivo + transferencias + Mercado Pago</small>
        </div>
        <div className="ledger-month-figure ledger-month-pending">
          <span>PENDIENTE ACTUAL DEL GIMNASIO</span>
          <strong>{money(pendingCents, settings.currency)}</strong>
          <small>Incluye cuotas de cualquier mes; es el saldo de hoy, no el del mes seleccionado.</small>
        </div>
        <dl className="ledger-month-methods">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method}>
              <dt>{paymentMethods[method as keyof typeof paymentMethods]}</dt>
              <dd>{money(amount, settings.currency)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="ledger-calendar" aria-label="Movimientos por día">
        <div className="ledger-calendar-heading">
          <div><span className="eyebrow">RECORRÉ EL MES</span><h2>Día a día</h2></div>
          <span>Deslizá para ver más →</span>
        </div>
        <a className="ledger-skip-link" href="#ledger-selected-day">Saltar al detalle del día</a>
        <LedgerDayRail days={railDays} month={month} selected={selectedDay} />
      </section>
      <section className="ledger-selected-day" id="ledger-selected-day" tabIndex={-1} aria-label="Detalle del día seleccionado">
        <div>
          <span className="eyebrow">MOVIMIENTOS DEL DÍA</span>
          <h2>{dateLabel(selectedDay)}</h2>
        </div>
        <div><span>Ingresó ese día</span><strong>{money(dailyReceived, settings.currency)}</strong></div>
      </section>
      <section className="daily-section" aria-labelledby="daily-payments">
        <div className="daily-section-heading">
          <div><span className="eyebrow">DINERO RECIBIDO</span><h2 id="daily-payments">Abonos</h2></div>
          <span>{dailyPayments.length}</span>
        </div>
        {dailyPayments.length ? (
          <ol className="daily-list">
            {dailyPayments.map((batch) => {
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
          <span>{dailyPeriods.length}</span>
        </div>
        <p className="daily-section-note">El precio de la cuota no se suma a caja. Su saldo indica lo que falta cobrar hoy.</p>
        {dailyPeriods.length ? (
          <ol className="daily-list">
            {dailyPeriods.map((period) => <li key={period.id}>
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
          <span>{dailyCustomers.length + dailyEvents.length}</span>
        </div>
        {dailyCustomers.length || dailyEvents.length ? (
          <ol className="daily-list">
            {dailyCustomers.map((customer) => <li key={customer.id}>
              <Link href={`/clientes/${customer.id}/historial`}>
                <div className="daily-entry-main"><strong>{customer.name}</strong><span>Perfil creado</span></div>
              </Link>
            </li>)}
            {dailyEvents.map((event) => <li key={event.id}>
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
