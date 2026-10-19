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
  customer?: { name: string; phone: string; email: string; notes: string };
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
