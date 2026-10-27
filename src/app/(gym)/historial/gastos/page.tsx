import { SummaryNavigation } from "@/components/shared/summary-navigation";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import {
  ExpenseEditor,
  ExpensePaymentForm,
  OperationForm,
} from "@/features/gym/components/operation-forms";
import { getExpenseData } from "@/features/gym/server/operations";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { money } from "@/features/gym/domain/money";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
import { validMonth, shiftMonth } from "@/features/gym/domain/ledger-calendar";
import { paymentMethods } from "@/features/gym/validation/contracts";
export const metadata = { title: "Gastos" };
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; guardado?: string; estado?: string }>;
}) {
  const [settings, { staff }, params] = await Promise.all([
    requireSettings(),
    requireStaff(),
    searchParams,
  ]);
  const today = todayIn(settings.time_zone),
    month = validMonth(params.mes) ? params.mes : today.slice(0, 7),
    owner = staff.role === "owner";
  const data = await getExpenseData(month);
  const status =
    params.estado === "pagados"
      ? "pagados"
      : params.estado === "todos"
        ? "todos"
        : "pendientes";
  const visibleExpenses = data.expenses.filter(
    (expense) =>
      status === "todos" ||
      (status === "pagados"
        ? expense.balance_cents === 0
        : expense.balance_cents! > 0),
  );
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRACIÓN"
        title="Gastos del gimnasio"
        description="Cargá la factura cuando llega y registrá el pago cuando la abones. Crear un gasto no descuenta dinero."
        back={{ href: `/historial?mes=${month}`, label: "Resumen" }}
      />
      {params.guardado ? (
        <p role="status" className="notice">
          Cambios guardados correctamente.
        </p>
      ) : null}
      <SummaryNavigation month={month} active="expenses" />
      <form className="operation-month">
        <label>
          Mes
          <input name="mes" type="month" required defaultValue={month} />
        </label>
        <button type="submit">Ver mes</button>
        <Link href={`/historial/gastos?mes=${shiftMonth(month, -1)}`}>
          Anterior
        </Link>
        <Link href={`/historial/gastos?mes=${shiftMonth(month, 1)}`}>
          Siguiente
        </Link>
      </form>
      <div className="operation-totals">
        <div>
          <span>Pagado este mes</span>
          <strong>{money(data.spent, settings.currency)}</strong>
        </div>
        <div>
          <span>Gastos pendientes · todos los meses</span>
          <strong>{money(data.pending, settings.currency)}</strong>
        </div>
      </div>
      <div className="workflow-guide">
        <strong>Factura recibida → Registrar gasto → Registrar pago</strong>
        <p>
          Podés cargar los datos a mano o con una foto. Los recordatorios de
          vencimiento llegan a tu bandeja y a los dispositivos con
          notificaciones activadas.
        </p>
        {owner ? (
          <Link href="/avisos">Configurar avisos al celular →</Link>
        ) : null}
      </div>
      {owner && !data.closing ? (
        <div className="operation-grid">
          <details className="operation-panel">
            <summary>Nuevo gasto</summary>
            <p>
              Cargá una factura o gasto puntual. El pago se registra después,
              incluso si fue parcial.
            </p>
            <ExpenseEditor
              month={month}
              today={today}
              requestId={crypto.randomUUID()}
            />
          </details>
          <details className="operation-panel">
            <summary>Cargar gastos fijos de este mes</summary>
            <p>
              Solo se crean los que faltan para este mes. Podés ajustar luego
              cada importe.
            </p>
            <OperationForm
              operation="generate"
              month={month}
              label="Cargar gastos fijos del mes"
            />
          </details>
        </div>
      ) : null}
      {data.closing ? (
        <p className="notice">
          El mes tiene un cierre conservado. Los gastos anteriores no se editan;
          los pagos o correcciones nuevos se registran en su fecha real.
        </p>
      ) : null}
      <section className="operation-section">
        <h2>Facturas y gastos del mes</h2>
        <nav className="operation-tabs" aria-label="Estado de gastos">
          {(
            [
              ["pendientes", "Por pagar"],
              ["pagados", "Pagados"],
              ["todos", "Todos"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`/historial/gastos?mes=${month}&estado=${value}`}
              aria-current={status === value ? "page" : undefined}
            >
              {label} ·{" "}
              {
                data.expenses.filter(
                  (e) =>
                    value === "todos" ||
                    (value === "pagados"
                      ? e.balance_cents === 0
                      : e.balance_cents! > 0),
                ).length
              }
            </Link>
          ))}
        </nav>
        {!visibleExpenses.length ? (
          <p className="daily-empty">
            No hay gastos para este filtro en el mes elegido.
          </p>
        ) : (
          visibleExpenses.map((expense) => (
            <article
              key={expense.id}
              className="operation-panel"
              id={`gasto-${expense.id}`}
            >
              <div className="operation-entry">
                <div>
                  <h3>{expense.title}</h3>
                  {expense.supplier || expense.invoice_number ? (
                    <p>
                      {expense.supplier}
                      {expense.invoice_number
                        ? ` · Factura ${expense.invoice_number}`
                        : ""}
                    </p>
                  ) : null}
                  <p>
                    {expense.category} · vence {dateLabel(expense.due_on!)}
                  </p>
                </div>
                <strong>
                  {money(expense.total_cents!, settings.currency)}
                </strong>
              </div>
              <p>
                {expense.balance_cents === 0
                  ? "Pagado"
                  : expense.paid_cents! > 0
                    ? "Pago parcial"
                    : expense.due_on! < today
                      ? "Vencido · pendiente de pago"
                      : "Pendiente"}{" "}
                · Abonado {money(expense.paid_cents!, settings.currency)} ·
                Falta {money(expense.balance_cents!, settings.currency)}
              </p>
              {expense.notes ? <p>{expense.notes}</p> : null}
              {owner && expense.balance_cents! > 0 ? (
                <details>
                  <summary>Registrar pago</summary>
                  <ExpensePaymentForm
                    id={expense.id!}
                    balance={expense.balance_cents!}
                    month={month}
                    currency={settings.currency}
                    requestId={crypto.randomUUID()}
                  />
                </details>
              ) : null}
              {owner && !data.closing ? (
                <details>
                  <summary>Ajustar concepto o importe</summary>
                  <ExpenseEditor
                    month={month}
                    today={today}
                    requestId={crypto.randomUUID()}
                    expense={{
                      id: expense.id!,
                      title: expense.title!,
                      category: expense.category!,
                      total_cents: expense.total_cents!,
                      due_on: expense.due_on!,
                      notes: expense.notes!,
                      revision: expense.revision!,
                      template_id: expense.template_id,
                      template_month: expense.template_month,
                      request_id: expense.request_id!,
                      created_at: expense.created_at!,
                      created_by: expense.created_by!,
                      supplier: expense.supplier ?? "",
                      invoice_number: expense.invoice_number ?? "",
                    }}
                  />
                </details>
              ) : null}
            </article>
          ))
        )}
      </section>
      <details className="operation-panel">
        <summary>Historial de pagos del mes</summary>
        {!data.payments.length ? (
          <p className="daily-empty">
            Todavía no se registraron salidas de dinero.
          </p>
        ) : (
          data.payments.map((p) => (
            <article className="operation-panel" key={p.id}>
              <div className="operation-entry">
                <div>
                  <h3>{p.expenses?.title}</h3>
                  <p>
                    {dateLabel(p.occurred_on)} ·{" "}
                    {p.reversal_of ? "Corrección" : "Pago"}
                  </p>
                </div>
                <strong>
                  {p.reversal_of ? "+" : "−"}{" "}
                  {money(p.amount_cents, settings.currency)}
                </strong>
              </div>
              <p>
                {p.lines
                  .map(
                    (e) =>
                      `${paymentMethods[e.method]} ${money(e.amount, settings.currency)}`,
                  )
                  .join(" · ")}
              </p>
              {p.reason ? <p>Motivo: {p.reason}</p> : null}
              {owner && !p.reversal_of && !p.reversed ? (
                <details>
                  <summary>Corregir este pago</summary>
                  <p>
                    Se registra una devolución del importe en la fecha de hoy y
                    se recupera el saldo del gasto. El pago original permanece.
                  </p>
                  <OperationForm
                    operation="expense-reversal"
                    id={p.expense_id}
                    requestId={crypto.randomUUID()}
                    month={month}
                    label="Registrar corrección"
                  >
                    <input type="hidden" name="reverseId" value={p.id} />
                    <label>
                      Motivo
                      <input
                        name="reason"
                        required
                        minLength={3}
                        maxLength={300}
                      />
                    </label>
                  </OperationForm>
                </details>
              ) : null}
            </article>
          ))
        )}
      </details>
      <details className="operation-panel">
        <summary>Configurar gastos fijos mensuales</summary>
        <p className="muted">
          Guardá servicios que se repiten, como alquiler o internet. Después usá
          «Cargar gastos fijos de este mes» para crear sus facturas. Cambiar
          estos valores no modifica facturas ya cargadas.
        </p>
        {owner ? (
          <details className="operation-panel">
            <summary>Añadir gasto fijo</summary>
            <ExpenseEditor
              month={month}
              today={today}
              requestId="template-new"
            />
          </details>
        ) : null}
        {data.templates.map((template) => (
          <details className="operation-panel" key={template.id}>
            <summary>
              {template.title} · día {template.due_day} ·{" "}
              {money(template.amount_cents, settings.currency)}{" "}
              {template.active ? "" : "· inactiva"}
            </summary>
            {owner ? (
              <ExpenseEditor
                month={month}
                today={today}
                requestId={crypto.randomUUID()}
                template={template}
              />
            ) : (
              <p>{template.category}</p>
            )}
          </details>
        ))}
      </details>
    </>
  );
}
