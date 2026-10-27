"use client";
import { useEffect, useRef, useState } from "react";
import type { Worker } from "tesseract.js";
import { parseInvoiceText, type InvoiceDraft } from "../domain/invoice";
let activeCapture: symbol | null = null;

export function InvoiceCapture({
  onUse,
}: {
  onUse(draft: InvoiceDraft): void;
}) {
  const [draft, setDraft] = useState<InvoiceDraft | null>(null),
    [preview, setPreview] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [checked, setChecked] = useState(false);
  const job = useRef<{
      cancelled: boolean;
      worker?: Worker;
      cancel?: () => void;
    } | null>(null),
    url = useRef("");
  const clearImage = () => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    setPreview("");
  };
  useEffect(
    () => () => {
      if (job.current) {
        job.current.cancelled = true;
        job.current.cancel?.();
        void job.current.worker?.terminate().catch(() => {});
        job.current = null;
      }
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  const read = async (file: File | undefined) => {
    if (!file || job.current) return;
    if (activeCapture) {
      setMessage(
        "Terminá o cancelá la otra lectura antes de abrir una nueva foto.",
      );
      return;
    }
    if (
      file.size > 12 * 1024 * 1024 ||
      !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
    ) {
      setMessage("Elegí una foto JPG, PNG, WebP o HEIC de hasta 12 MB.");
      return;
    }
    const token = Symbol("invoice-capture");
    activeCapture = token;
    clearImage();
    setDraft(null);
    setChecked(false);
    setBusy(true);
    setMessage("Preparando foto…");
    const current: {
      cancelled: boolean;
      worker?: Worker;
      cancel?: () => void;
    } = {
      cancelled: false,
    };
    job.current = current;
    let canvas: HTMLCanvasElement | undefined;
    try {
      url.current = URL.createObjectURL(file);
      setPreview(url.current);
      const image = new Image();
      image.src = url.current;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 24_000_000)
        throw new Error(
          "La foto es demasiado grande. Tomá otra con menor resolución.",
        );
      if (current.cancelled) return;
      const ratio = Math.min(
        1,
        1800 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * ratio);
      canvas.height = Math.round(image.naturalHeight * ratio);
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("No pudimos preparar la foto en este navegador.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("No pudimos leer esta imagen.")),
          "image/png",
        ),
      );
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("spa", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr",
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (event) => {
          if (!current.cancelled)
            setMessage(
              event.status === "recognizing text"
                ? `Leyendo factura… ${Math.round(event.progress * 100)} %`
                : "Preparando el lector en este dispositivo…",
            );
        },
      });
      current.worker = worker;
      if (current.cancelled) return;
      const result = await Promise.race([
        worker.recognize(blob),
        new Promise<never>((_, reject) => {
          current.cancel = () => reject(new Error("Lectura cancelada"));
        }),
      ]);
      if (!current.cancelled) {
        setDraft(parseInvoiceText(result.data.text));
        setMessage(
          "Lectura lista. Revisá el importe y el vencimiento antes de usar los datos.",
        );
      }
    } catch (error) {
      if (!current.cancelled) {
        setMessage(
          error instanceof Error && /^(La foto|No pudimos)/.test(error.message)
            ? error.message
            : "No pudimos leer esta foto. Probá con más luz y sin inclinación, o completá el gasto manualmente.",
        );
        clearImage();
      }
    } finally {
      if (activeCapture === token) activeCapture = null;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      try {
        await current.worker?.terminate();
      } catch {
        /* Already terminated by Cancel. */
      }
      if (job.current === current) {
        job.current = null;
        setBusy(false);
        if (current.cancelled) {
          clearImage();
          setMessage("Lectura cancelada. No se guardó la foto.");
        }
      }
    }
  };
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
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (job.current) {
                job.current.cancelled = true;
                job.current.cancel?.();
                void job.current.worker?.terminate().catch(() => {});
              }
              clearImage();
              setMessage("Cancelando lectura…");
            }}
          >
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
