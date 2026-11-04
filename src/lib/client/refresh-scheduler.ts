/** Per-component work queue: no cached data, one request at a time, one trailing refresh. */
export function createRefreshScheduler(
  task: (signal: AbortSignal) => Promise<void>,
  canRun: () => boolean,
  delay = 250,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;
  let dirty = false;
  let disposed = false;
  async function run() {
    timer = undefined;
    if (disposed || active || !dirty || !canRun()) return;
    dirty = false;
    const controller = new AbortController();
    active = controller;
    try {
      await task(controller.signal);
    } finally {
      active = undefined;
      if (dirty && !disposed && canRun()) schedule();
    }
  }
  function schedule() {
    if (disposed) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), delay);
  }
  return {
    schedule,
    flush() {
      if (disposed) return;
      dirty = true;
      clearTimeout(timer);
      void run();
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      active?.abort();
    },
  };
}
