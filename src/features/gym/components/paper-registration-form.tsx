"use client";
import { useActionState, useRef, useState } from "react";
import { CustomerFields } from "./customer-fields";
import {
  FormFeedback,
  SubmitButton,
  TextField,
} from "@/components/shared/form-parts";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { paperRegistrationAction } from "../server/paper-actions";
import { money, parseMoney } from "../domain/money";
import { endDate } from "../domain/dates";
import { paymentMethods } from "../validation/contracts";
import type { Tables } from "@/lib/supabase/database.types";
import type { ActionResult } from "../server/actions";
type DraftPayment = {
  id: string;
  date: string;
  cash: string;
  transfer: string;
  mercado_pago: string;
};
export function PaperRegistrationForm({
  activities,
  currency,
  today,
  requestId,
}: {
  activities: Tables<"activities">[];
  currency: string;
  today: string;
  requestId: string;
}) {
  const [operationId] = useState(requestId),
    [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [startsOn, setStartsOn] = useState(""),
    [endsOverride, setEndsOverride] = useState<string | null>(null),
    [total, setTotal] = useState(""),
    [paid, setPaid] = useState("0"),
    [usedClasses, setUsedClasses] = useState("0"),
    [payments, setPayments] = useState<DraftPayment[]>([]);
  const activity = activities.find((a) => a.id === activityId),
    sessions = activity?.duration_unit === "sessions";
  const endsOn = sessions
    ? ""
    : (endsOverride ??
      (startsOn && activity
        ? endDate(
            startsOn,
            activity.duration_count,
            activity.duration_unit as "months" | "days",
          )
        : ""));
  const detail = payments.map((p) => ({
    date: p.date,
    entries: Object.keys(paymentMethods)
      .filter(
        (key) =>
          p[key as keyof typeof paymentMethods].trim() !== "" &&
          parseMoney(p[key as keyof typeof paymentMethods]) !== 0,
      )
      .map((method) => ({
        method,
        amount: parseMoney(p[method as keyof typeof paymentMethods]) ?? -1,
      })),
  }));
  const detailed = detail.reduce(
      (sum, p) =>
        sum + p.entries.reduce((n, e) => n + Math.max(0, e.amount), 0),
      0,
    ),
    paidCents = parseMoney(paid) ?? 0,
    totalCents = parseMoney(total) ?? 0;
  const keepDraft = useRef(false);
  const [state, action] = useActionState(
    async (previous: ActionResult, data: FormData) => {
      keepDraft.current = false;
      const result = await paperRegistrationAction(previous, data);
      keepDraft.current = Boolean(result.error);
      return result;
    },
    {},
  );
  const updatePayment = (
    id: string,
    key: "date" | "cash" | "transfer" | "mercado_pago",
    value: string,
  ) =>
    setPayments((rows) =>
      rows.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    );
  return (
    <form
      action={action}
      className="editor-form"
      onReset={(event) => {
        if (keepDraft.current) event.preventDefault();
      }}
    >
      <input type="hidden" name="requestId" value={operationId} />
      <input
        type="hidden"
        name="activityRevision"
        value={activity?.revision ?? 0}
      />
      <input
        type="hidden"
        name="unit"
        value={activity?.duration_unit ?? "months"}
      />
      <input
        type="hidden"
        name="historicalPayments"
        value={JSON.stringify(detail)}
      />
      <FieldGroup>
        <section className="form-section">
          <div className="section-heading">
            <span>01</span>
            <h2>Datos del cliente</h2>
          </div>
          <CustomerFields errors={state.fieldErrors} />
        </section>
        <section className="form-section">
          <div className="section-heading">
            <span>02</span>
            <h2>Lo que figura en el papel</h2>
          </div>
          <Field>
            <FieldLabel htmlFor="paper-activity">Actividad o plan</FieldLabel>
            <NativeSelect
              id="paper-activity"
              name="activityId"
              value={activityId}
              onChange={(e) => {
                setActivityId(e.target.value);
                setEndsOverride(null);
                setUsedClasses("0");
              }}
              required
            >
              {activities.map((a) => (
                <NativeSelectOption value={a.id} key={a.id}>
                  {a.name}
                  {a.active ? "" : " · Inactiva"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="operation-grid">
            <TextField
              name="startsOn"
              id="paper-start"
              type="date"
              label={sessions ? "Inicio del pack" : "Inicio de la cuota"}
              value={startsOn}
              onChange={(e) => {
                setStartsOn(e.target.value);
                setEndsOverride(null);
              }}
              min="1900-01-01"
              max={today}
              required
              error={state.fieldErrors?.startsOn}
            />
            {sessions ? (
              <>
                <input name="endsOn" type="hidden" value="" />
                <TextField
                  name="usedClasses"
                  id="paper-used"
                  type="number"
                  label="Clases ya usadas"
                  min={0}
                  max={activity?.duration_count ?? 0}
                  step={1}
                  required
                  value={usedClasses}
                  onChange={(e) => setUsedClasses(e.target.value)}
                  error={state.fieldErrors?.usedClasses}
                />
              </>
            ) : (
              <>
                <input name="usedClasses" type="hidden" value="0" />
                <TextField
                  name="endsOn"
                  id="paper-end"
                  type="date"
                  label="Vencimiento anotado"
                  min={startsOn || "1900-01-01"}
                  max="2200-12-31"
                  required
                  value={endsOn}
                  onChange={(e) => setEndsOverride(e.target.value)}
                  error={state.fieldErrors?.endsOn}
                />
              </>
            )}
          </div>
          <p className="muted">
            {sessions
              ? `El pack tiene ${activity?.duration_count ?? 0} clases, sin vencimiento por fecha. Conservamos el uso previo sin inventar fechas de asistencia.`
              : "Podés cargar una cuota ya vencida. Sugerimos el vencimiento según la actividad; corregilo si el papel indica otro."}
          </p>
          <div className="operation-grid">
            <TextField
              name="total"
              id="paper-total"
              label="Importe pactado en el papel (ARS)"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              maxLength={12}
              placeholder="Ej.: 25000"
              error={state.fieldErrors?.total}
            />
            <TextField
              name="paid"
              id="paper-paid"
              label="Total que ya había abonado (ARS)"
              inputMode="decimal"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              required
              maxLength={12}
              error={state.fieldErrors?.paid}
            />
          </div>
          <p className="muted">
            Usá el monto original, aunque hoy la actividad tenga otro precio. Si
            no pagó nada, dejá abonado en 0. No se recibe dinero nuevo al pasar
            este registro.
          </p>
          <dl className="payment-summary" aria-live="polite">
            <div>
              <dt>Saldo pendiente</dt>
              <dd className={paidCents > totalCents ? "amount-error" : ""}>
                {money(totalCents - paidCents, currency)}
              </dd>
            </div>
            <div>
              <dt>Abonado previo sin detalle</dt>
              <dd>{money(Math.max(0, paidCents - detailed), currency)}</dd>
            </div>
          </dl>
        </section>
        <section className="form-section">
          <div className="section-heading">
            <span>03</span>
            <h2>Pagos anteriores (opcional)</h2>
          </div>
          <p className="muted">
            Si conocés fecha, importe y medio, podés detallarlos. El resto de lo
            abonado queda como saldo previo a favor, sin inventar un ingreso en
            la caja de hoy.
          </p>
          {payments.map((payment, i) => (
            <fieldset key={payment.id} className="paper-payment">
              <legend>Pago anterior {i + 1}</legend>
              <TextField
                id={`paper-date-${payment.id}`}
                name={`paper-date-${payment.id}`}
                label="Fecha del pago anterior"
                type="date"
                min="1900-01-01"
                max={today}
                required
                value={payment.date}
                onChange={(e) =>
                  updatePayment(payment.id, "date", e.target.value)
                }
              />
              <div className="operation-grid">
                {Object.entries(paymentMethods).map(([key, label]) => (
                  <TextField
                    key={key}
                    id={`paper-${payment.id}-${key}`}
                    name={`paper-${payment.id}-${key}`}
                    label={label}
                    inputMode="decimal"
                    maxLength={12}
                    value={payment[key as keyof typeof paymentMethods]}
                    onChange={(e) =>
                      updatePayment(
                        payment.id,
                        key as keyof typeof paymentMethods,
                        e.target.value,
                      )
                    }
                    placeholder="0,00"
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setPayments((rows) => rows.filter((p) => p.id !== payment.id))
                }
              >
                Quitar pago anterior {i + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={payments.length >= 20}
            onClick={() =>
              setPayments((rows) => [
                ...rows,
                {
                  id: crypto.randomUUID(),
                  date: "",
                  cash: "",
                  transfer: "",
                  mercado_pago: "",
                },
              ])
            }
          >
            Añadir pago anterior
          </Button>
          {detailed > paidCents ? (
            <p role="status" className="amount-error">
              El detalle supera el total abonado. Revisá los importes.
            </p>
          ) : null}
        </section>
        <FormFeedback state={state} />
        <div className="form-footer">
          <p>
            Guardamos el perfil y su situación anterior. Un pago que recibas hoy
            se registra después desde el perfil.
          </p>
          <SubmitButton>Guardar registro del papel</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
