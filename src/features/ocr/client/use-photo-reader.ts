"use client";
import { useEffect, useRef, useState } from "react";
import type { Worker } from "tesseract.js";

// One local OCR worker across invoice and registration readers.
let activeCapture: symbol | null = null;
type Job = { cancelled: boolean; worker?: Worker; cancel?: () => void };
export function usePhotoReader({
  onText,
  onStart,
  readingLabel,
  readyMessage,
}: {
  onText(text: string): void;
  onStart(): void;
  readingLabel: string;
  readyMessage: string;
}) {
  const [preview, setPreview] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const job = useRef<Job | null>(null),
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
    const token = Symbol("photo-capture"),
      current: Job = { cancelled: false };
    activeCapture = token;
    job.current = current;
    clearImage();
    onStart();
    setBusy(true);
    setMessage("Preparando foto…");
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
      if (current.cancelled) return;
      const { createWorker } = await import("tesseract.js");
      if (current.cancelled) return;
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
                ? `${readingLabel}… ${Math.round(event.progress * 100)} %`
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
        onText(result.data.text);
        setMessage(readyMessage);
      }
    } catch (error) {
      if (!current.cancelled) {
        setMessage(
          error instanceof Error && /^(La foto|No pudimos)/.test(error.message)
            ? error.message
            : "No pudimos leer esta foto. Probá con más luz y sin inclinación, o completá los datos manualmente.",
        );
        clearImage();
      }
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      try {
        await current.worker?.terminate();
      } catch {
        /* Cancel may already have terminated it. */
      }
      if (activeCapture === token) activeCapture = null;
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
  const cancel = () => {
    if (job.current) {
      job.current.cancelled = true;
      job.current.cancel?.();
      void job.current.worker?.terminate().catch(() => {});
    }
    clearImage();
    setMessage("Cancelando lectura…");
  };
  return { preview, message, busy, read, cancel, clearImage, setMessage };
}
