import { abortable } from "./abortable";
/**
 * Minimal adapter for the self-hosted Tesseract.js 7 worker protocol.
 * createWorker() exposes terminate only after initialization and may leave its
 * promise pending when language loading fails. Owning the native worker lets us
 * terminate loading/WASM immediately, including on unmount. Recheck this adapter
 * and the real-OCR browser tests whenever the pinned Tesseract version changes.
 */
type Progress = { status: string; progress: number };
type Pending = {
  id: string;
  resolve(value: unknown): void;
  reject(error: Error): void;
};
const failure = () =>
  new Error(
    "No pudimos iniciar o completar el lector. Revisá la conexión y volvé a intentar, o cargá los datos a mano.",
  );
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

export async function recognizePhoto(
  blob: Blob,
  {
    signal,
    onProgress,
  }: { signal: AbortSignal; onProgress(value: Progress): void },
): Promise<string> {
  signal.throwIfAborted();
  const worker = new Worker("/ocr/worker.min.js", {
    name: "shelby-photo-reader",
  });
  let pending: Pending | undefined;
  let sequence = 0;
  let terminated = false;
  const terminate = () => {
    if (!terminated) {
      terminated = true;
      worker.terminate();
    }
  };
  const fail = (error: Error) => {
    pending?.reject(error);
    pending = undefined;
    terminate();
  };
  const stop = () =>
    fail(signal.reason instanceof Error ? signal.reason : failure());
  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    fail(failure());
  };
  const onMessageError = () => fail(failure());
  const onMessage = ({ data }: MessageEvent<unknown>) => {
    if (!record(data) || data.jobId !== pending?.id || terminated) return;
    if (data.status === "progress") {
      if (
        record(data.data) &&
        typeof data.data.status === "string" &&
        typeof data.data.progress === "number"
      )
        onProgress({
          status: data.data.status,
          progress: Math.min(1, Math.max(0, data.data.progress)),
        });
    } else if (data.status === "resolve") {
      pending?.resolve(data.data);
      pending = undefined;
    } else if (data.status === "reject") {
      // Do not expose worker errors, image text or internal paths in the UI/logs.
      fail(failure());
    }
  };
  worker.addEventListener("message", onMessage);
  worker.addEventListener("error", onError);
  worker.addEventListener("messageerror", onMessageError);
  signal.addEventListener("abort", stop, { once: true });
  const request = (action: string, payload: Record<string, unknown>) =>
    new Promise<unknown>((resolve, reject) => {
      if (signal.aborted || terminated) {
        reject(signal.reason ?? failure());
        return;
      }
      const id = `photo-${++sequence}`;
      pending = { id, resolve, reject };
      worker.postMessage({
        workerId: "shelby-photo-reader",
        jobId: id,
        action,
        payload,
      });
    });
  try {
    await request("load", {
      options: { lstmOnly: true, corePath: "/ocr", logging: false },
    });
    await request("loadLanguage", {
      langs: "spa",
      options: {
        langPath: "/ocr",
        cacheMethod: "none",
        gzip: true,
        lstmOnly: true,
      },
    });
    await request("initialize", { langs: "spa", oem: 1, config: {} });
    const bytes = new Uint8Array(await abortable(blob.arrayBuffer(), signal));
    const result = await request("recognize", {
      image: bytes,
      options: {},
      output: { text: true },
    });
    if (!record(result) || typeof result.text !== "string") throw failure();
    return result.text;
  } finally {
    signal.removeEventListener("abort", stop);
    worker.removeEventListener("message", onMessage);
    worker.removeEventListener("error", onError);
    worker.removeEventListener("messageerror", onMessageError);
    terminate();
  }
}
