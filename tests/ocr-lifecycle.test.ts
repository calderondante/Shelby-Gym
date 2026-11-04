import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recognizePhoto } from "@/features/ocr/client/recognize-photo";
import { abortable } from "@/features/ocr/client/abortable";
type Packet = {
  action: string;
  jobId: string;
  payload: Record<string, unknown>;
};
class TestWorker extends EventTarget {
  static instances: TestWorker[] = [];
  static failAt = "";
  static stallAt = "";
  messages: Packet[] = [];
  terminate = vi.fn();
  constructor(public path: string) {
    super();
    TestWorker.instances.push(this);
  }
  postMessage(packet: Packet) {
    this.messages.push(packet);
    if (packet.action === TestWorker.stallAt) return;
    queueMicrotask(() =>
      this.dispatchEvent(
        new MessageEvent("message", {
          data: {
            jobId: packet.jobId,
            action: packet.action,
            status: packet.action === TestWorker.failAt ? "reject" : "resolve",
            data:
              packet.action === "recognize"
                ? { text: "Nombre: Ana Gómez" }
                : {},
          },
        }),
      ),
    );
  }
}
beforeEach(() => {
  TestWorker.instances = [];
  TestWorker.failAt = "";
  TestWorker.stallAt = "";
  vi.stubGlobal("Worker", TestWorker);
});
afterEach(() => vi.unstubAllGlobals());
const photo = new Blob(["synthetic image bytes"], { type: "image/png" });
const run = (controller = new AbortController()) =>
  recognizePhoto(photo, { signal: controller.signal, onProgress: vi.fn() });
describe("local OCR lifecycle", () => {
  it("loads only the local Spanish resources, returns text and terminates", async () => {
    await expect(run()).resolves.toBe("Nombre: Ana Gómez");
    const worker = TestWorker.instances[0];
    expect(worker.path).toBe("/ocr/worker.min.js");
    expect(worker.messages.map((p) => p.action)).toEqual([
      "load",
      "loadLanguage",
      "initialize",
      "recognize",
    ]);
    expect(worker.messages[1].payload).toMatchObject({
      langs: "spa",
      options: { langPath: "/ocr", cacheMethod: "none" },
    });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it.each(["load", "loadLanguage", "initialize", "recognize"])(
    "a failure during %s settles and allows a fresh scan",
    async (phase) => {
      TestWorker.failAt = phase;
      await expect(run()).rejects.toThrow("No pudimos");
      expect(TestWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
      TestWorker.failAt = "";
      await expect(run()).resolves.toContain("Ana");
      expect(TestWorker.instances[1].terminate).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["load", "loadLanguage", "initialize", "recognize"])(
    "cancel terminates a hung %s immediately",
    async (phase) => {
      TestWorker.stallAt = phase;
      const controller = new AbortController();
      const result = run(controller);
      const rejection = expect(result).rejects.toThrow("Lectura cancelada");
      await vi.waitFor(() =>
        expect(TestWorker.instances[0].messages.at(-1)?.action).toBe(phase),
      );
      controller.abort(new Error("Lectura cancelada"));
      await rejection;
      expect(TestWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
    },
  );
  it("does not start a worker after unmount/cancel", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(run(controller)).rejects.toThrow("cancelled");
    expect(TestWorker.instances).toHaveLength(0);
  });
  it("decoding can be interrupted even when its underlying promise never settles", async () => {
    const controller = new AbortController();
    const result = abortable(new Promise<never>(() => {}), controller.signal);
    controller.abort(new Error("Lectura agotó el tiempo"));
    await expect(result).rejects.toThrow("agotó el tiempo");
  });
  it("a malformed worker response releases resources", async () => {
    TestWorker.stallAt = "recognize";
    const result = run();
    const rejection = expect(result).rejects.toThrow("No pudimos");
    await vi.waitFor(() =>
      expect(TestWorker.instances[0].messages.at(-1)?.action).toBe("recognize"),
    );
    const worker = TestWorker.instances[0];
    worker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jobId: worker.messages.at(-1)?.jobId,
          status: "resolve",
          data: { unexpected: true },
        },
      }),
    );
    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
