"use client";
import { Camera } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePhotoReader } from "@/features/ocr/client/use-photo-reader";
import {
  emptyHistory,
  personalFields,
  historicalFields,
  historicalKey,
  parseRegistrationText,
  selectedRegistrationValues,
  type PersonalValues,
  type HistoricalValues,
  type RegistrationKey,
} from "../domain/photo-draft";

export type HistoricalPhotoContext = {
  values: HistoricalValues;
  activities: { id: string; name: string; duration_unit: string }[];
  onApply(values: Partial<HistoricalValues>): void;
};
export function RegistrationPhoto({
  current,
  history,
  onApply,
}: {
  current: PersonalValues;
  history?: HistoricalPhotoContext;
  onApply(values: Partial<PersonalValues>): void;
}) {
  const id = useId(),
    details = useRef<HTMLDetailsElement>(null),
    { pending } = useFormStatus();
  const [draft, setDraft] = useState<ReturnType<
      typeof parseRegistrationText
    > | null>(null),
    [selected, setSelected] = useState<Set<RegistrationKey>>(new Set()),
    [allowReplace, setAllowReplace] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [historyReviewed, setHistoryReviewed] = useState(false);
  const currentValues = { ...current, ...(history?.values ?? emptyHistory) };
  const photo = usePhotoReader({
    readingLabel: "Leyendo ficha",
    readyMessage:
      "Lectura lista. Elegí y revisá los datos que vas a pasar al formulario.",
    onStart: () => {
      setDraft(null);
      setSelected(new Set());
      setAllowReplace(false);
      setReviewed(false);
      setHistoryReviewed(false);
    },
    onText: (text) => {
      const result = parseRegistrationText(text);
      setDraft(result);
      // Financial/history fields always require deliberate selection, even when empty.
      setSelected(
        new Set(
          personalFields
            .filter((f) => result.values[f.key] && !current[f.key])
            .map((f) => f.key),
        ),
      );
    },
  });
  const eligible = new Set(selected);
  const targetActivity = history?.activities.find(
    (a) =>
      a.id ===
      (eligible.has("activityId") && allowReplace && draft?.values.activityId
        ? draft.values.activityId
        : history.values.activityId),
  );
  if (targetActivity?.duration_unit === "sessions") eligible.delete("endsOn");
  const proposal = draft
    ? selectedRegistrationValues(
        draft.values,
        currentValues,
        eligible,
        allowReplace,
        true,
      )
    : {};
  const needsHistoryReview = Object.keys(proposal).some((k) =>
    historicalKey(k as RegistrationKey),
  );
  const close = () => {
    if (photo.busy) photo.cancel();
    photo.clearImage();
    setDraft(null);
    setSelected(new Set());
  };
  const update = (key: RegistrationKey, value: string) => {
    if (draft)
      setDraft({ ...draft, values: { ...draft.values, [key]: value } });
    setReviewed(false);
    if (historicalKey(key)) setHistoryReviewed(false);
  };
  return (
    <details
      ref={details}
      className="registration-photo"
      onToggle={(event) => {
        if (!event.currentTarget.open) {
          close();
          photo.setMessage("");
        }
      }}
    >
      <summary>
        <Camera size={19} aria-hidden="true" />
        Completar desde foto
      </summary>
      <div className="registration-photo-body">
        <p>
          Una ficha por foto. Revisás los datos antes de pasarlos al formulario;
          todavía no se crea el cliente.
        </p>
        <p className="muted">
          La escritura a mano puede fallar. Si algo no se reconoce, completalo
          manualmente.
        </p>
        <div className="communication-tools">
          <label className="photo-picker">
            Tomar foto
            <input
              aria-label="Tomar foto de inscripción"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={photo.busy || pending}
              onChange={(event) => {
                void photo.read(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <label className="photo-picker">
            Elegir foto
            <input
              aria-label="Elegir foto de inscripción"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={photo.busy || pending}
              onChange={(event) => {
                void photo.read(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {photo.busy ? (
            <button type="button" className="text-link" onClick={photo.cancel}>
              Cancelar lectura
            </button>
          ) : null}
        </div>
        {photo.message ? <p role="status">{photo.message}</p> : null}
        {photo.preview ? (
          <div
            className="invoice-preview"
            style={{ backgroundImage: `url("${photo.preview}")` }}
            role="img"
            aria-label="Foto temporal de la inscripción para revisar"
          />
        ) : null}
        {draft ? (
          <fieldset
            className="registration-photo-review"
            disabled={photo.busy || pending}
          >
            <legend>Datos detectados</legend>
            {draft.warnings.map((w) => (
              <p className="notice" key={w}>
                {w}
              </p>
            ))}
            <label className="operation-check">
              <input
                type="checkbox"
                checked={allowReplace}
                onChange={(e) => {
                  setAllowReplace(e.target.checked);
                  setSelected(
                    (previous) =>
                      new Set(
                        [...previous].filter(
                          (key) => !currentValues[key].trim(),
                        ),
                      ),
                  );
                  setReviewed(false);
                  setHistoryReviewed(false);
                }}
              />
              Permitir reemplazar los campos ya completados que seleccione
            </label>
            {[...personalFields, ...(history ? historicalFields : [])].map(
              (field) => {
                const key = field.key,
                  alreadyFilled = Boolean(currentValues[key].trim());
                const disabled =
                  (alreadyFilled && !allowReplace) ||
                  (key === "endsOn" &&
                    targetActivity?.duration_unit === "sessions");
                return (
                  <div className="registration-photo-field" key={key}>
                    <label className="operation-check">
                      <input
                        type="checkbox"
                        aria-label={`Usar ${field.label} de la foto`}
                        checked={selected.has(key) && !disabled}
                        disabled={disabled}
                        onChange={(e) => {
                          setSelected((previous) => {
                            const next = new Set(previous);
                            if (e.target.checked) next.add(key);
                            else next.delete(key);
                            return next;
                          });
                          setReviewed(false);
                          if (historicalKey(key)) setHistoryReviewed(false);
                        }}
                      />
                      Usar {field.label.toLowerCase()}
                    </label>
                    <label htmlFor={`${id}-${key}`}>
                      {field.label} en la foto
                    </label>
                    {key === "activityId" ? (
                      <>
                        <p className="muted">
                          Actividad leída:{" "}
                          {draft.activityName || "No reconocida"}. Elegí una
                          existente para confirmarla.
                        </p>
                        <select
                          id={`${id}-${key}`}
                          value={draft.values.activityId}
                          onChange={(e) => update(key, e.target.value)}
                        >
                          <option value="">Elegir actividad existente</option>
                          {history?.activities.map((a) => (
                            <option value={a.id} key={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : key === "birthMonth" ? (
                      <select
                        id={`${id}-${key}`}
                        value={draft.values.birthMonth}
                        onChange={(e) => update(key, e.target.value)}
                      >
                        <option value="">Sin reconocer</option>
                        {Array.from({ length: 12 }, (_, n) => (
                          <option key={n} value={n + 1}>
                            {new Intl.DateTimeFormat("es-AR", {
                              month: "long",
                              timeZone: "UTC",
                            }).format(new Date(Date.UTC(2000, n, 15)))}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`${id}-${key}`}
                        type={
                          key === "startsOn" || key === "endsOn"
                            ? "date"
                            : "text"
                        }
                        inputMode={
                          key === "total" || key === "paid"
                            ? "decimal"
                            : key === "phone"
                              ? "tel"
                              : undefined
                        }
                        maxLength={"max" in field ? field.max : 12}
                        value={draft.values[key]}
                        onChange={(e) => update(key, e.target.value)}
                        autoComplete="off"
                      />
                    )}
                    {alreadyFilled ? (
                      <small className="muted">
                        {key === "activityId"
                          ? "El formulario ya tiene una actividad."
                          : `En el formulario: ${currentValues[key]}.`}{" "}
                        {allowReplace
                          ? "Sólo cambia si seleccionás este campo."
                          : "Se conserva salvo que habilites reemplazar."}
                      </small>
                    ) : null}
                    {key === "endsOn" &&
                    targetActivity?.duration_unit === "sessions" ? (
                      <small className="muted">
                        El pack de clases no tiene vencimiento por fecha.
                      </small>
                    ) : null}
                  </div>
                );
              },
            )}
            {history ? (
              <label className="operation-check">
                <input
                  type="checkbox"
                  checked={historyReviewed}
                  onChange={(e) => setHistoryReviewed(e.target.checked)}
                />
                Revisé la actividad, las fechas y los importes históricos
                seleccionados. No son un cobro de hoy.
              </label>
            ) : null}
            <label className="operation-check">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Revisé los datos seleccionados para esta inscripción.
            </label>
            <div className="communication-tools">
              <button
                type="button"
                className="text-link"
                disabled={
                  !reviewed ||
                  (needsHistoryReview && !historyReviewed) ||
                  !Object.keys(proposal).length
                }
                onClick={() => {
                  const patch = selectedRegistrationValues(
                    draft.values,
                    currentValues,
                    eligible,
                    allowReplace,
                    historyReviewed,
                  );
                  const personal: Partial<PersonalValues> = {},
                    past: Partial<HistoricalValues> = {};
                  for (const field of personalFields)
                    if (patch[field.key] !== undefined)
                      personal[field.key] = patch[field.key];
                  for (const field of historicalFields)
                    if (patch[field.key] !== undefined)
                      past[field.key] = patch[field.key];
                  onApply(personal);
                  history?.onApply(past);
                  photo.clearImage();
                  setDraft(null);
                  setSelected(new Set());
                  photo.setMessage(
                    "Datos aplicados. Foto descartada de la app; falta completar y guardar el registro.",
                  );
                }}
              >
                Aplicar datos y descartar foto
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  close();
                  photo.setMessage(
                    "Lectura descartada. El formulario conserva sus datos.",
                  );
                }}
              >
                Descartar lectura
              </button>
            </div>
          </fieldset>
        ) : null}
        <small className="muted">
          Lectura local, sin subir la imagen. No copiamos firmas, datos médicos
          ni consentimientos. El original de la galería no se elimina.
        </small>
      </div>
    </details>
  );
}
