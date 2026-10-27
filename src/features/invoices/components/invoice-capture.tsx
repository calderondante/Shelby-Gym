"use client";
import { useState } from "react";
import { usePhotoReader } from "@/features/ocr/client/use-photo-reader";
import { parseInvoiceText, type InvoiceDraft } from "../domain/invoice";

export function InvoiceCapture({
  onUse,
}: {
  onUse(draft: InvoiceDraft): void;
}) {
  const [draft, setDraft] = useState<InvoiceDraft | null>(null),
    [checked, setChecked] = useState(false);
  const { preview, message, busy, read, cancel, clearImage, setMessage } =
    usePhotoReader({
      onStart: () => {
        setDraft(null);
        setChecked(false);
      },
      onText: (text) => setDraft(parseInvoiceText(text)),
      readingLabel: "Leyendo factura",
      readyMessage:
        "Lectura lista. Revisá el importe y el vencimiento antes de usar los datos.",
    });
  return (
    <details className="operation-panel invoice-capture">
      <summary>Registrar una factura con foto</summary>
      <p>
        La lectura se hace en este dispositivo. Solo se guardan los datos que
        revises; la foto no se sube ni se conserva en la app.
      </p>
      <p className="muted">
        Si este gasto ya fue generado en el mes, abrí «Ajustar concepto o
        importe» y usá la foto allí para actualizarlo.
      </p>
      <div className="communication-tools">
        <label className="photo-picker">
          Tomar foto
          <input
            aria-label="Tomar foto de factura"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="photo-picker">
          Elegir foto
          <input
            aria-label="Elegir foto de factura"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={busy}
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {busy ? (
          <button type="button" className="text-link" onClick={cancel}>
            Cancelar lectura
          </button>
        ) : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
      {preview ? (
        <div
          className="invoice-preview"
          style={{ backgroundImage: `url("${preview}")` }}
          role="img"
          aria-label="Foto temporal de la factura para revisar"
        />
      ) : null}
      {draft ? (
        <div className="operation-form">
          {draft.warnings.map((warning) => (
            <p className="notice" key={warning}>
              {warning}
            </p>
          ))}
          <label>
            Proveedor o servicio detectado
            <input
              value={draft.supplier}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
            />
          </label>
          <label>
            Número de factura detectado
            <input
              value={draft.invoiceNumber}
              maxLength={80}
              onChange={(e) =>
                setDraft({ ...draft, invoiceNumber: e.target.value })
              }
            />
          </label>
          <label>
            Importe total detectado
            <input
              value={draft.amount}
              inputMode="decimal"
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </label>
          <label>
            Vencimiento detectado
            <input
              type="date"
              value={draft.dueOn}
              onChange={(e) => setDraft({ ...draft, dueOn: e.target.value })}
            />
          </label>
          <label className="operation-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            Revisé el importe y el vencimiento.
          </label>
          <button
            type="button"
            className="text-link"
            disabled={!checked || !draft.amount || !draft.dueOn}
            onClick={() => {
              onUse(draft);
              clearImage();
              setDraft(null);
              setMessage(
                "Datos pasados al formulario. La foto temporal se descartó; falta guardar el gasto.",
              );
            }}
          >
            Usar estos datos y descartar foto
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              clearImage();
              setDraft(null);
              setMessage(
                "Foto descartada. Podés completar el gasto manualmente.",
              );
            }}
          >
            Descartar lectura
          </button>
        </div>
      ) : null}
      <small>
        La primera lectura descarga el lector de texto. Podés cancelar y
        completar el gasto a mano. Una foto que ya esté en tu galería no se
        elimina de allí.
      </small>
    </details>
  );
}
