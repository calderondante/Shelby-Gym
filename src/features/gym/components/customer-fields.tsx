"use client";
import { useState } from "react";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/shared/form-parts";
export function CustomerFields({
  customer,
  errors = {},
}: {
  customer?: { name: string; phone: string; email: string; notes: string; birth_month?: number | null };
  errors?: Record<string, string>;
}) {
  const [notes, setNotes] = useState(customer?.notes ?? "");
  return (
    <FieldGroup>
      <TextField
        name="name"
        label="Nombre y apellido"
        required
        minLength={2}
        maxLength={120}
        autoComplete="name"
        defaultValue={customer?.name}
        error={errors.name}
        placeholder="¿Cómo se llama el cliente?"
      />
      <FieldGroup>
        <TextField
          name="phone"
          label="Teléfono (opcional)"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          defaultValue={customer?.phone}
          error={errors.phone}
        />
      </FieldGroup>
      <div className="birthday-select-field">
        <label htmlFor="birthMonth">Mes de cumpleaños (opcional)</label>
        <select id="birthMonth" name="birthMonth" defaultValue={customer?.birth_month ?? ""} aria-describedby="birthday-help">
          <option value="">Elegir mes</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, i, 15)))}</option>)}
        </select>
        <small id="birthday-help">Alcanza con el mes para el sorteo.</small>
      </div>
      <details className="optional-details">
        <summary>Correo y nota (opcionales)</summary>
        <FieldGroup>
          <TextField
            name="email"
            label="Correo (opcional)"
            type="email"
            autoComplete="email"
            maxLength={254}
            defaultValue={customer?.email}
            error={errors.email}
          />
          <Field>
            <FieldLabel htmlFor="notes">
              Nota de recepción (opcional)
            </FieldLabel>
            <Textarea
              name="notes"
              id="notes"
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <FieldDescription>
              Evitá anotar datos médicos o información sensible.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </details>
    </FieldGroup>
  );
}
