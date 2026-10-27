"use client";
import { useActionState, useState } from "react";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import { CustomerFields } from "./customer-fields";
import { blankPayments, PaymentFields } from "./payment-fields";
import { enrollAction } from "../server/actions";
import { money } from "../domain/money";
import { dateLabel, endDate } from "../domain/dates";
import type { Tables } from "@/lib/supabase/database.types";
export function EnrollmentForm({
  activities: initialActivities,
  currency,
  today,
  requestId,
  customerId,
}: {
  activities: Tables<"activities">[];
  currency: string;
  today: string;
  requestId: string;
  customerId?: string;
}) {
  const [activities] = useState(initialActivities);
  const [operationId] = useState(requestId);
  const [startsOn] = useState(today);
  const [state, action] = useActionState(enrollAction, {});
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [payments, setPayments] = useState(blankPayments);
  const activity = activities.find((a) => a.id === activityId);
  const total = activity?.offer_price_cents ?? activity?.price_cents ?? 0;
  return (
    <form action={action} className="editor-form">
      <input type="hidden" name="requestId" value={operationId} />
      <input type="hidden" name="customerId" value={customerId ?? ""} />
      <input
        type="hidden"
        name="expectedRevision"
        value={activity?.revision ?? 0}
      />
      <input type="hidden" name="expectedStart" value={startsOn} />
      <input type="hidden" name="expectedPrice" value={total} />
      <FieldGroup>
        {!customerId ? (
          <section className="form-section">
            <div className="section-heading">
              <span>01</span>
              <h2>Datos del cliente</h2>
            </div>
            <CustomerFields errors={state.fieldErrors} photoRegistration={{}} />
          </section>
        ) : null}
        <section className="form-section">
          <div className="section-heading">
            <span>{customerId ? "01" : "02"}</span>
            <h2>Su actividad</h2>
          </div>
          <Field data-invalid={Boolean(state.fieldErrors?.activityId)}>
            <FieldLabel htmlFor="activityId">Actividad o plan</FieldLabel>
            <NativeSelect
              id="activityId"
              name="activityId"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              required
              aria-describedby="plan-description"
            >
              <NativeSelectOption value="" disabled>
                Elegí una actividad
              </NativeSelectOption>
              {activities.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.name} ·{" "}
                  {money(a.offer_price_cents ?? a.price_cents, currency)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {state.fieldErrors?.activityId ? (
              <FieldError>{state.fieldErrors.activityId}</FieldError>
            ) : null}
            <FieldDescription id="plan-description">
              {activity?.description ||
                "Las condiciones las configura el dueño en Actividades."}
            </FieldDescription>
          </Field>
          {activity ? (
            <div className="plan-preview">
              <div>
                <span className="muted">
                  {activity.duration_unit === "sessions"
                    ? "Precio del pack"
                    : "Cuota del período"}
                </span>
                <strong>{money(total, currency)}</strong>
                {activity.offer_price_cents ? (
                  <small>
                    {activity.offer_label} · habitual{" "}
                    {money(activity.price_cents, currency)}
                  </small>
                ) : null}
              </div>
              <div>
                <span className="muted">Con el primer abono de hoy</span>
                <strong className="date-range">
                  {activity.duration_unit === "sessions" ? (
                    `${activity.duration_count} ${activity.duration_count === 1 ? "clase" : "clases"} · sin vencimiento`
                  ) : (
                    <>
                      {dateLabel(startsOn)} →{" "}
                      {dateLabel(
                        endDate(
                          startsOn,
                          activity.duration_count,
                          activity.duration_unit as "months" | "days",
                        ),
                      )}
                    </>
                  )}
                </strong>
                <small>
                  {activity.duration_unit === "sessions"
                    ? "Registrá cada clase realizada desde el perfil. Puede quedar saldo."
                    : "La vigencia empieza aunque quede saldo."}
                </small>
              </div>
            </div>
          ) : null}
        </section>
        <section className="form-section">
          <div className="section-heading">
            <span>{customerId ? "02" : "03"}</span>
            <h2>Primera cuota</h2>
          </div>
          <PaymentFields
            values={payments}
            onChange={setPayments}
            total={total}
            currency={currency}
            errors={state.fieldErrors}
          />
        </section>
        <FormFeedback state={state} />
        <div className="form-footer">
          <p>Guardamos el perfil, la actividad y el abono juntos.</p>
          <SubmitButton>
            {customerId
              ? activity?.duration_unit === "sessions"
                ? "Registrar pack de clases"
                : "Iniciar nuevo período"
              : "Crear cliente y registrar abono"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
