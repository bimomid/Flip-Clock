import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCountClockStore } from "@/stores/CountClock";

describe("count clock store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accumulates elapsed time while running", () => {
    const store = useCountClockStore();

    store.startOrPause();
    vi.advanceTimersByTime(1_500);

    expect(store.isRunning).toBe(true);
    expect(store.elapsedTime).toBe(1_500);
    expect(store.formattedTime).toBe("00:01.50");
  });

  it("stops accumulating when paused", () => {
    const store = useCountClockStore();

    store.startOrPause();
    vi.advanceTimersByTime(1_000);
    store.startOrPause();
    vi.advanceTimersByTime(2_000);

    expect(store.isRunning).toBe(false);
    expect(store.isPaused).toBe(true);
    expect(store.elapsedTime).toBe(1_000);
  });

  it("records laps with absolute and split times, newest first", () => {
    const store = useCountClockStore();

    store.startOrPause();
    vi.advanceTimersByTime(1_000);
    store.resetOrLap();
    vi.advanceTimersByTime(500);
    store.resetOrLap();

    expect(store.lapTimes).toHaveLength(2);
    expect(store.lapTimes[0]).toEqual({ lapNumber: 2, elapsed: 1_500, split: 500 });
    expect(store.lapTimes[1]).toEqual({ lapNumber: 1, elapsed: 1_000, split: 1_000 });
  });

  it("keeps running after a lap", () => {
    const store = useCountClockStore();

    store.startOrPause();
    vi.advanceTimersByTime(1_000);
    store.resetOrLap();
    vi.advanceTimersByTime(1_000);

    expect(store.isRunning).toBe(true);
    expect(store.elapsedTime).toBe(2_000);
  });

  it("clears time and laps when not running", () => {
    const store = useCountClockStore();

    store.startOrPause();
    vi.advanceTimersByTime(1_000);
    store.resetOrLap();
    store.startOrPause();
    store.resetOrLap();

    expect(store.elapsedTime).toBe(0);
    expect(store.lapTimes).toEqual([]);
    expect(store.isRunning).toBe(false);
    expect(store.isPaused).toBe(false);
    expect(store.lastTickTime).toBeNull();
  });

  it("catches up on elapsed time after a restart while running", () => {
    const store = useCountClockStore();
    store.startOrPause();
    store.startOrPause();
    store.isRunning = true;
    store.lastTickTime = Date.now() - 3_000;

    store.recoverState();

    expect(store.elapsedTime).toBe(3_000);
    vi.advanceTimersByTime(1_000);
    expect(store.elapsedTime).toBe(4_000);
  });

  it("stops instead of catching up after a multi-hour suspension", () => {
    const store = useCountClockStore();
    store.startOrPause();
    store.isRunning = true;
    store.lastTickTime = Date.now() - 13 * 60 * 60 * 1000;

    store.recoverState();

    expect(store.isRunning).toBe(false);
    expect(store.isPaused).toBe(true);
    expect(store.elapsedTime).toBe(0);
    expect(store.lastTickTime).toBeNull();
  });

  it("toggles panel visibility", () => {
    const store = useCountClockStore();

    store.toggleVisibility();
    expect(store.isVisible).toBe(true);

    store.toggleVisibility();
    expect(store.isVisible).toBe(false);
  });
});
