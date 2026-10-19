"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  FormFeedback,
  SubmitButton,
  TextField,
} from "@/components/shared/form-parts";
import { settingsAction } from "../server/actions";
export function SettingsForm({
  settings,
}: {
  settings: { currency: string; time_zone: string } | null;
}) {
  const [state, action] = useActionState(settingsAction, {});
  return (
    <form action={action} className="editor-form">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currency">Moneda del gimnasio</FieldLabel>
          <NativeSelect
            id="currency"
            name="currency"
            defaultValue={settings?.currency ?? "ARS"}
          >
            {[
              "ARS",
              "USD",
              "EUR",
              "UYU",
              "CLP",
              "MXN",
              "COP",
              "PEN",
              "BRL",
            ].map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <TextField
          name="timeZone"
          label="Zona horaria"
          defaultValue={settings?.time_zone ?? "America/Argentina/Buenos_Aires"}
          required
          maxLength={80}
        />
        <p className="muted">
          Las fechas de inicio y vencimiento usan esta zona horaria. Confirmá
          estos datos antes de registrar la primera cuota.
        </p>
        <FormFeedback state={state} />
        <SubmitButton>Guardar configuración</SubmitButton>
        {state.success ? (
          <Link className="text-link" href="/actividades">
            Continuar a Actividades →
          </Link>
        ) : null}
      </FieldGroup>
    </form>
  );
}
