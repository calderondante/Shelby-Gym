"use client";
import { useEffect, useRef, useState } from "react";
import { abortable } from "./abortable";

// One local OCR worker across invoice and registration readers.
let activeCapture: symbol | null = null;
type Job = { cancelled: boolean; controller: AbortController };
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
        job.current.controller.abort();
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
      current: Job = { cancelled: false, controller: new AbortController() };
    activeCapture = token;
    job.current = current;
    clearImage();
    setBusy(true);
    setMessage("Preparando foto…");
    let canvas: HTMLCanvasElement | undefined;
    let decodedImage: HTMLImageElement | undefined;
    // A lost resource or decoder must not retain the photo or block later scans.
    const deadline = setTimeout(
      () =>
        current.controller.abort(
          new Error(
            "No pudimos completar la lectura a tiempo. Revisá la conexión y volvé a intentar, o cargá los datos a mano.",
          ),
        ),
      120_000,
    );
    const { signal } = current.controller;
    try {
      onStart();
      url.current = URL.createObjectURL(file);
      setPreview(url.current);
      const image = (decodedImage = new Image());
      image.src = url.current;
      await abortable(image.decode(), signal);
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
      const blob = await abortable(
        new Promise<Blob>((resolve, reject) =>
          canvas!.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("No pudimos leer esta imagen.")),
            "image/png",
          ),
        ),
        signal,
      );
      if (current.cancelled) return;
      const { recognizePhoto } = await abortable(
        import("./recognize-photo"),
        signal,
      );
      const text = await recognizePhoto(blob, {
        signal,
        onProgress: (event) => {
          if (!current.cancelled && job.current === current)
            setMessage(
              event.status === "recognizing text"
                ? `${readingLabel}… ${Math.round(event.progress * 100)} %`
                : "Preparando el lector en este dispositivo…",
            );
        },
      });
      if (!current.cancelled && job.current === current) {
        onText(text);
        setMessage(readyMessage);
      }
    } catch (error) {
      if (!current.cancelled && job.current === current) {
        setMessage(
          error instanceof Error && /^(La foto|No pudimos)/.test(error.message)
            ? error.message
            : "No pudimos leer esta foto. Probá con más luz y sin inclinación, o completá los datos manualmente.",
        );
        clearImage();
      }
    } finally {
      clearTimeout(deadline);
      if (decodedImage) decodedImage.src = "";
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
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
      job.current.controller.abort();
    }
    clearImage();
    setMessage("Cancelando lectura…");
  };
  return { preview, message, busy, read, cancel, clearImage, setMessage };
}
