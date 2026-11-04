export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const stop = () =>
      reject(
        signal.reason ?? new DOMException("Lectura cancelada", "AbortError"),
      );
    if (signal.aborted) {
      // Observe a promise already started by the caller even after cancellation.
      void promise.catch(() => {});
      stop();
      return;
    }
    signal.addEventListener("abort", stop, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", stop));
  });
}
