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
import {
  RegistrationPhoto,
  type HistoricalPhotoContext,
} from "@/features/registration/components/registration-photo";
import type { PersonalValues } from "@/features/registration/domain/photo-draft";
export function CustomerFields({
  customer,
  errors = {},
  photoRegistration,
}: {
  customer?: {
    name: string;
    phone: string;
    email: string;
    notes: string;
    birth_month?: number | null;
    instagram?: string;
    marketing_opt_in?: boolean;
    instagram_marketing_opt_in?: boolean;
  };
  errors?: Record<string, string>;
  photoRegistration?: { history?: HistoricalPhotoContext };
}) {
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [personal, setPersonal] = useState<PersonalValues>(() => ({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    instagram: customer?.instagram ?? "",
    email: customer?.email ?? "",
    birthMonth: customer?.birth_month ? String(customer.birth_month) : "",
  }));
  return (
    <FieldGroup>
      {photoRegistration ? (
        <RegistrationPhoto
          current={personal}
          history={photoRegistration.history}
          onApply={(patch) =>
            setPersonal((previous) => ({ ...previous, ...patch }))
          }
        />
      ) : null}
      <TextField
        name="name"
        label="Nombre y apellido"
        required
        minLength={2}
        maxLength={120}
        autoComplete="name"
        value={personal.name}
        onChange={(e) =>
          setPersonal((previous) => ({ ...previous, name: e.target.value }))
        }
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
          value={personal.phone}
          onChange={(e) =>
            setPersonal((previous) => ({ ...previous, phone: e.target.value }))
          }
          error={errors.phone}
        />
      </FieldGroup>
      <TextField
        name="instagram"
        label="Instagram (opcional)"
        placeholder="@usuario"
        maxLength={31}
        autoCapitalize="none"
        autoCorrect="off"
        value={personal.instagram}
        onChange={(e) =>
          setPersonal((previous) => ({
            ...previous,
            instagram: e.target.value,
          }))
        }
        error={errors.instagram}
      />
      <Field orientation="horizontal">
        <input
          className="check-control"
          type="checkbox"
          id="marketingOptIn"
          name="marketingOptIn"
          defaultChecked={customer?.marketing_opt_in ?? false}
        />
        <FieldLabel htmlFor="marketingOptIn">
          Acepta recibir ofertas del gimnasio por WhatsApp
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <input
          className="check-control"
          type="checkbox"
          id="instagramMarketingOptIn"
          name="instagramMarketingOptIn"
          defaultChecked={customer?.instagram_marketing_opt_in ?? false}
        />
        <FieldLabel htmlFor="instagramMarketingOptIn">
          Acepta recibir ofertas por Instagram
        </FieldLabel>
      </Field>
      <div className="birthday-select-field">
        <label htmlFor="birthMonth">Mes de cumpleaños (opcional)</label>
        <select
          id="birthMonth"
          name="birthMonth"
          value={personal.birthMonth}
          onChange={(e) =>
            setPersonal((previous) => ({
              ...previous,
              birthMonth: e.target.value,
            }))
          }
          aria-describedby="birthday-help"
        >
          <option value="">Elegir mes</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {new Intl.DateTimeFormat("es-AR", {
                month: "long",
                timeZone: "UTC",
              }).format(new Date(Date.UTC(2000, i, 15)))}
            </option>
          ))}
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
            value={personal.email}
            onChange={(e) =>
              setPersonal((previous) => ({
                ...previous,
                email: e.target.value,
              }))
            }
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
