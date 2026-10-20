import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import {
  OperationForm,
  PrintButton,
} from "@/features/gym/components/operation-forms";
import { getReport } from "@/features/gym/server/reports";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { todayIn, dateLabel } from "@/features/gym/domain/dates";
import { validMonth } from "@/features/gym/domain/ledger-calendar";
import { money } from "@/features/gym/domain/money";
import { paymentMethods } from "@/features/gym/validation/contracts";
export const metadata = { title: "Resumen mensual" };
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; version?: string }>;
}) {
  const [settings, { staff }, params] = await Promise.all([
    requireSettings(),
    requireStaff(),
    searchParams,
  ]);
  const today = todayIn(settings.time_zone),
    month = validMonth(params.mes) ? params.mes : today.slice(0, 7);
  const { totals, closing, frozen } = await getReport(
    month,
    settings.time_zone,
    settings.currency,
    params.version !== "actual",
  );
  const version = frozen ? "cierre" : "actual";
  return (
    <div className="monthly-report">
      <PageHeading
        eyebrow="SHELBY GYM"
        title={`Resumen · ${new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}`}
        description={
          frozen
            ? "Cierre conservado. Los saldos representan lo pendiente al terminar ese mes, según los movimientos conocidos al cerrar."
            : month === today.slice(0, 7)
              ? "Resumen parcial del mes. Los pendientes muestran el saldo actual."
              : "Consulta actualizada. Los pendientes reflejan pagos posteriores del cliente."
        }
        back={{ href: `/historial?mes=${month}`, label: "Historial" }}
      />
      <nav className="operation-tabs" aria-label="Versión del resumen">
        <Link
          href={`/historial/resumen?mes=${month}&version=actual`}
          aria-current={!frozen ? "page" : undefined}
        >
          Valores actuales
        </Link>
        {closing ? (
          <Link
            href={`/historial/resumen?mes=${month}&version=cierre`}
            aria-current={frozen ? "page" : undefined}
          >
            Cierre guardado
          </Link>
        ) : null}
        <a href={`/historial/exportar?mes=${month}&version=${version}`}>
          Descargar CSV / Excel
        </a>
        <PrintButton />
      </nav>
      <p className="report-generated">
        Generado{" "}
        {new Intl.DateTimeFormat("es-AR", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: settings.time_zone,
        }).format(new Date())}
        {frozen && closing
          ? ` · cierre registrado ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: settings.time_zone }).format(new Date(closing.created_at))}`
          : ""}{" "}
        · ARS · horario de Argentina
      </p>
      <div className="operation-totals">
        <div>
          <span>Cobrado</span>
          <strong>{money(totals.received, settings.currency)}</strong>
        </div>
        <div>
          <span>Gastado</span>
          <strong>{money(totals.spent, settings.currency)}</strong>
        </div>
        <div>
          <span>Neto del mes</span>
          <strong>
            {money(totals.received - totals.spent, settings.currency)}
          </strong>
        </div>
        <div>
          <span>Gastos pendientes {frozen ? "al cierre" : "actuales"}</span>
          <strong>{money(totals.pendingExpenses, settings.currency)}</strong>
        </div>
        <div>
          <span>Pendiente de cuotas de {month}</span>
          <strong>{money(totals.pendingMemberships, settings.currency)}</strong>
        </div>
        <div>
          <span>Pendiente de clases de {month}</span>
          <strong>{money(totals.pendingClasses, settings.currency)}</strong>
        </div>
        <div>
          <span>Pendiente total {frozen ? "al cierre" : "actual"}</span>
          <strong>{money(totals.pendingTotal, settings.currency)}</strong>
        </div>
      </div>
      <section className="operation-section">
        <h2>Cobros por medio</h2>
        {Object.entries(paymentMethods).map(([method, label]) => (
          <div className="operation-entry" key={method}>
            <span>{label}</span>
            <strong>
              {money(
                totals.payments
                  .filter((p) => p.method === method)
                  .reduce((sum, p) => sum + p.amount_cents, 0),
                settings.currency,
              )}
            </strong>
          </div>
        ))}
      </section>
      <section className="operation-section">
        <h2>Abonos recibidos</h2>
        {totals.payments.length ? (
          totals.payments.map((p, i) => (
            <div className="operation-entry" key={i}>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {dateLabel(p.day)} · {p.activity_name} ·{" "}
                  {paymentMethods[p.method as keyof typeof paymentMethods]}
                </small>
              </span>
              <strong>{money(p.amount_cents, settings.currency)}</strong>
            </div>
          ))
        ) : (
          <p>Sin cobros en este mes.</p>
        )}
      </section>
      <section className="operation-section">
        <h2>Gastos y correcciones</h2>
        {totals.expenses.length ? (
          totals.expenses.map((e, i) => (
            <div className="operation-entry" key={i}>
              <span>
                {e.title}
                <small>
                  {dateLabel(e.occurred_on)} ·{" "}
                  {e.reversal_of ? "Corrección" : "Pago"}
                </small>
              </span>
              <strong>
                {e.reversal_of ? "+" : "−"}{" "}
                {money(e.amount_cents, settings.currency)}
              </strong>
            </div>
          ))
        ) : (
          <p>Sin gastos pagados en este mes.</p>
        )}
      </section>
      <section className="operation-section">
        <h2>Deudas {frozen ? "al cierre" : "actuales"} por mes de origen</h2>
        {totals.debts.length ? (
          totals.debts.map((d, i) => (
            <div className="operation-entry" key={i}>
              <span>
                {d.name}
                <small>
                  {d.starts_on.slice(0, 7)} · {d.activity_name}
                </small>
              </span>
              <strong>{money(d.balance_cents, settings.currency)}</strong>
            </div>
          ))
        ) : (
          <p>Sin saldos pendientes.</p>
        )}
      </section>
      {staff.role === "owner" && !closing && month < today.slice(0, 7) ? (
        <details className="operation-panel report-close">
          <summary>Conservar cierre del mes</summary>
          <p>
            Se conserva este resumen con las deudas al último día del mes.
            Revisá antes los cobros, gastos y movimientos importados. No se
            puede sobrescribir desde la app.
          </p>
          <OperationForm
            operation="close"
            month={month}
            label="Cerrar y conservar resumen"
          >
            <label className="operation-check">
              <input type="checkbox" name="confirm" required />
              Revisé los movimientos y confirmo el cierre.
            </label>
          </OperationForm>
        </details>
      ) : null}
    </div>
  );
}
