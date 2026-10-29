import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeoutError, withTimeout } from "@/utils/async";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("透传结果", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("透传错误", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });

  it("超过时限抛 TimeoutError", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<number>(() => {}), 5000);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
});
