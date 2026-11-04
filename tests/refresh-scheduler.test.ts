import { afterEach, describe, expect, it, vi } from "vitest";
import { createRefreshScheduler } from "../src/lib/client/refresh-scheduler";
afterEach(() => vi.useRealTimers());
describe("refresh queue", () => {
  it("combines a burst into one request", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => {});
    const q = createRefreshScheduler(load, () => true);
    for (let i = 0; i < 12; i++) q.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(load).toHaveBeenCalledTimes(1);
    q.dispose();
  });
  it("never overlaps requests and refreshes once after changes during a request", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((r) => {
            finish = r;
          }),
      )
      .mockResolvedValue(undefined);
    const q = createRefreshScheduler(load, () => true);
    q.flush();
    q.schedule();
    q.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(load).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(250);
    expect(load).toHaveBeenCalledTimes(2);
    q.dispose();
  });
  it("defers hidden/offline work until resumed", async () => {
    vi.useFakeTimers();
    let visible = false;
    const load = vi.fn(async () => {});
    const q = createRefreshScheduler(load, () => visible);
    q.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(load).not.toHaveBeenCalled();
    visible = true;
    q.schedule();
    await vi.advanceTimersByTimeAsync(250);
    expect(load).toHaveBeenCalledTimes(1);
    q.dispose();
  });
  it("aborts in-flight work and discards queued work on unmount", async () => {
    vi.useFakeTimers();
    let signal!: AbortSignal;
    let finish!: () => void;
    const load = vi.fn((s: AbortSignal) => {
      signal = s;
      return new Promise<void>((r) => {
        finish = r;
      });
    });
    const q = createRefreshScheduler(load, () => true);
    q.flush();
    q.schedule();
    q.dispose();
    expect(signal.aborted).toBe(true);
    finish();
    await vi.advanceTimersByTimeAsync(1000);
    q.flush();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
