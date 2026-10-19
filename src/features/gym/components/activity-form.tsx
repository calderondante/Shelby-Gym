"use client";
import { useActionState, useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  FormFeedback,
  SubmitButton,
  TextField,
} from "@/components/shared/form-parts";
import { activityAction } from "../server/actions";
import { amountInput } from "../domain/money";
import type { Tables } from "@/lib/supabase/database.types";
export function ActivityForm({
  activity: initialActivity,
  currency,
}: {
  activity?: Tables<"activities">;
  currency: string;
}) {
  const [activity] = useState(initialActivity);
  const [description, setDescription] = useState(activity?.description ?? "");
  const [unit, setUnit] = useState(activity?.duration_unit ?? "months");
  const [active, setActive] = useState(activity?.active ?? true);
  const [state, action] = useActionState(activityAction, {});
  return (
    <form action={action} className="editor-form">
      <input type="hidden" name="id" value={activity?.id ?? ""} />
      <input type="hidden" name="revision" value={activity?.revision ?? 0} />
      <FieldGroup>
        <TextField
          name="name"
          label="Nombre de la actividad o plan"
          placeholder="Ej.: Musculación + artes marciales"
          defaultValue={activity?.name}
          required
          maxLength={100}
          error={state.fieldErrors?.name}
        />
        <Field>
          <FieldLabel htmlFor="description">Qué incluye</FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="Disciplinas incluidas, condiciones y detalles para recepción."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <FieldDescription>
            Podés combinar varias actividades en una misma plantilla.
          </FieldDescription>
        </Field>
        <TextField
          name="price"
          label={`Precio habitual (${currency})`}
          inputMode="decimal"
          placeholder="0,00"
          required
          defaultValue={activity ? amountInput(activity.price_cents) : ""}
          error={state.fieldErrors?.price}
        />
        <div className="form-columns">
          <TextField
            name="duration"
            label="Duración"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={activity?.duration_count ?? 1}
            error={state.fieldErrors?.duration}
          />
          <Field>
            <FieldLabel htmlFor="unit">Unidad</FieldLabel>
            <NativeSelect
              id="unit"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <NativeSelectOption value="months">
                Meses calendario
              </NativeSelectOption>
              <NativeSelectOption value="days">Días</NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>
        <FieldDescription>
          Un mes desde el 11 de febrero vence el 11 de marzo. Si el día no
          existe en el mes siguiente, vence el último día de ese mes.
        </FieldDescription>
        <details
          className="offer-details"
          open={Boolean(activity?.offer_price_cents)}
        >
          <summary>Oferta opcional</summary>
          <FieldGroup>
            <TextField
              name="offerLabel"
              error={state.fieldErrors?.offerLabel}
              label="Nombre o condición de la oferta"
              defaultValue={activity?.offer_label}
              maxLength={100}
            />
            <TextField
              name="offerPrice"
              error={state.fieldErrors?.offerPrice}
              label={`Precio de oferta (${currency})`}
              inputMode="decimal"
              placeholder="Sin oferta"
              defaultValue={
                activity?.offer_price_cents
                  ? amountInput(activity.offer_price_cents)
                  : ""
              }
            />
            <FieldDescription>
              Se aplica a nuevos períodos hasta que la retires. Los períodos ya
              registrados conservan su precio.
            </FieldDescription>
          </FieldGroup>
        </details>
        <Field orientation="horizontal">
          <input
            className="check-control"
            id="active"
            name="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <FieldLabel htmlFor="active">
            Disponible para nuevas inscripciones
          </FieldLabel>
        </Field>
        <FormFeedback state={state} />
        <SubmitButton>
          {activity ? "Guardar cambios" : "Crear actividad"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
