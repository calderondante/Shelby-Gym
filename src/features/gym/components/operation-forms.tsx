"use client";
import { useActionState, useState, useRef, type ReactNode } from "react";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import type { ActionResult } from "../server/actions";
import { operationAction, sessionAction } from "../server/operation-actions";
import { blankPayments, PaymentFields } from "./payment-fields";
import { amountInput } from "../domain/money";
import type { Tables } from "@/lib/supabase/database.types";
import { InvoiceCapture } from "@/features/invoices/components/invoice-capture";
import type { InvoiceDraft } from "@/features/invoices/domain/invoice";

export function OperationForm({
  operation,
  month = "",
  id = "",
  revision = 0,
  children,
  label,
  requestId,
}: {
  operation: string;
  month?: string;
  id?: string;
  revision?: number;
  children?: ReactNode;
  label: string;
  requestId?: string;
}) {
  const keepDraft = useRef(false);
  const [state, action] = useActionState(
    async (previous: ActionResult, form: FormData) => {
      keepDraft.current = false;
      const result = await operationAction(previous, form);
      keepDraft.current = Boolean(result.error);
      return result;
    },
    {},
  );
  return (
    <form
      action={action}
      className="operation-form"
      onReset={(event) => {
        if (keepDraft.current) event.preventDefault();
      }}
    >
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="requestId" value={requestId ?? ""} />
      {children}
      <FormFeedback state={state} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}
export function ExpenseEditor({
  month,
  today,
  requestId,
  expense,
  template,
}: {
  month: string;
  today: string;
  requestId: string;
  expense?: Tables<"expenses">;
  template?: Tables<"expense_templates">;
}) {
  const isTemplate = !!template || requestId === "template-new";
  const [invoice, setInvoice] = useState<
    (InvoiceDraft & { key: string }) | null
  >(null);
  return (
    <>
      {!isTemplate ? (
        <InvoiceCapture
          onUse={(data) => setInvoice({ ...data, key: crypto.randomUUID() })}
        />
      ) : null}
      <OperationForm
        key={invoice?.key ?? "manual"}
        operation={isTemplate ? "template" : "expense"}
        month={month}
        requestId={requestId}
        id={expense?.id ?? template?.id}
        revision={expense?.revision ?? template?.revision}
        label={
          expense || template
            ? "Guardar cambios"
            : isTemplate
              ? "Crear gasto recurrente"
              : "Registrar gasto"
        }
      >
        <label>
          Concepto
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue={
              expense?.title ||
              invoice?.supplier.slice(0, 100) ||
              template?.title
            }
            placeholder="Ej.: Electricidad"
          />
        </label>
        <div className="operation-grid">
          <label>
            Categoría
            <input
              name="category"
              required
              maxLength={60}
              defaultValue={
                expense?.category ?? template?.category ?? "Servicios"
              }
            />
          </label>
          <label>
            Importe (ARS)
            <input
              name="amount"
              required
              inputMode="decimal"
              defaultValue={
                invoice?.amount ??
                amountInput(expense?.total_cents ?? template?.amount_cents ?? 0)
              }
            />
          </label>
        </div>
        {isTemplate ? (
          <>
            <label>
              Día de vencimiento
              <input
                name="dueDay"
                type="number"
                min={1}
                max={31}
                required
                defaultValue={template?.due_day ?? 10}
              />
            </label>
            <label className="operation-check">
              <input
                type="checkbox"
                name="active"
                defaultChecked={template?.active ?? true}
              />
              Generar en los próximos meses
            </label>
            <p className="muted">
              El importe es una sugerencia editable. Los meses ya generados
              conservan su valor.
            </p>
          </>
        ) : (
          <>
            <label>
              Proveedor o servicio (opcional)
              <input
                name="supplier"
                maxLength={160}
                defaultValue={invoice?.supplier ?? expense?.supplier}
              />
            </label>
            <label>
              Número de factura (opcional)
              <input
                name="invoiceNumber"
                maxLength={80}
                defaultValue={invoice?.invoiceNumber ?? expense?.invoice_number}
              />
            </label>
            <label>
              Vencimiento
              <input
                name="dueOn"
                type="date"
                required
                defaultValue={
                  invoice?.dueOn ||
                  expense?.due_on ||
                  (today.startsWith(month) ? today : `${month}-01`)
                }
              />
            </label>
            <label>
              Nota (opcional)
              <textarea
                name="notes"
                maxLength={500}
                defaultValue={expense?.notes}
                rows={2}
              />
            </label>
            <p className="muted">Registrar el gasto no lo marca como pagado.</p>
          </>
        )}
      </OperationForm>
    </>
  );
}
export function ExpensePaymentForm({
  id,
  month,
  balance,
  currency,
  requestId,
}: {
  id: string;
  month: string;
  balance: number;
  currency: string;
  requestId: string;
}) {
  const [payments, setPayments] = useState(blankPayments);
  return (
    <OperationForm
      operation="expense-payment"
      id={id}
      month={month}
      requestId={requestId}
      label="Registrar pago del gasto"
    >
      <PaymentFields
        kind="expense"
        values={payments}
        onChange={setPayments}
        total={balance}
        currency={currency}
      />
    </OperationForm>
  );
}
export function SessionForm({
  customerId,
  subscriptionId,
  balance,
  remaining,
  requestId,
  reverseId,
  owner,
}: {
  customerId: string;
  subscriptionId: string;
  balance: number;
  remaining: number;
  requestId: string;
  reverseId?: string;
  owner?: boolean;
}) {
  const [operationId, setOperationId] = useState(requestId);
  const [state, action] = useActionState(
    async (previous: { error?: string; success?: string }, form: FormData) => {
      const result = await sessionAction(previous, form);
      if (result.success) setOperationId(crypto.randomUUID());
      return result;
    },
    {},
  );
  if (reverseId && !owner) return null;
  return (
    <form action={action} className="operation-form session-form">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="requestId" value={operationId} />
      {reverseId ? (
        <>
          <input type="hidden" name="reverseId" value={reverseId} />
          <label>
            Motivo de corrección
            <input
              name="reason"
              required
              minLength={3}
              maxLength={300}
              placeholder="Ej.: Se registró dos veces"
            />
          </label>
        </>
      ) : balance > 0 ? (
        <label className="operation-check">
          <input type="checkbox" name="acknowledgeDebt" required />
          Confirmo la asistencia aunque el pack tenga saldo pendiente.
        </label>
      ) : null}
      <FormFeedback state={state} />
      {reverseId || remaining > 0 ? (
        <SubmitButton>
          {reverseId
            ? "Corregir y devolver clase"
            : "Registrar clase realizada"}
        </SubmitButton>
      ) : (
        <p className="muted">Este pack ya utilizó todas sus clases.</p>
      )}
    </form>
  );
}
export function PrintButton() {
  return (
    <button
      type="button"
      className="operation-print"
      onClick={() => window.print()}
    >
      Imprimir / guardar PDF
    </button>
  );
}
