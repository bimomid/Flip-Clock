import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useFocusTimerStore } from "@/stores/FocusTimer";

class FakeAudio {
  volume = 1;
  loop = false;
  paused = true;
  currentTime = 0;

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

describe("focus timer store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("Audio", FakeAudio);
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("counts down while running", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 1, 0);

    store.start();
    vi.advanceTimersByTime(30_000);

    expect(store.isRunning).toBe(true);
    expect(store.remainingTime).toBe(30_000);
    expect(store.formattedTime).toBe("00:00:30");
    expect(store.progress).toBeCloseTo(0.5);
  });

  it("stops counting while paused and continues on resume", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 1, 0);

    store.start();
    vi.advanceTimersByTime(10_000);
    store.pause();
    vi.advanceTimersByTime(5_000);

    expect(store.isPaused).toBe(true);
    expect(store.remainingTime).toBe(50_000);

    store.resume();
    vi.advanceTimersByTime(10_000);

    expect(store.isRunning).toBe(true);
    expect(store.remainingTime).toBe(40_000);
  });

  it("finishes the countdown, resets the remaining time and raises the alarm", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 0, 1);

    store.start();
    vi.advanceTimersByTime(1_000);

    expect(store.isRunning).toBe(false);
    expect(store.hasFinished).toBe(true);
    expect(store.isVisible).toBe(true);
    expect(store.remainingTime).toBe(store.totalDuration);
  });

  it("resets to the configured duration", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 2, 0);

    store.start();
    vi.advanceTimersByTime(60_000);
    store.reset();

    expect(store.isRunning).toBe(false);
    expect(store.isPaused).toBe(false);
    expect(store.remainingTime).toBe(120_000);
  });

  it("stops the running countdown when the duration changes", () => {
    const store = useFocusTimerStore();

    store.start();
    store.setDuration(0, 5, 0);

    expect(store.isRunning).toBe(false);
    expect(store.totalDuration).toBe(300_000);
    expect(store.remainingTime).toBe(300_000);
  });

  it("ignores start on an empty countdown", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 0, 0);

    store.start();

    expect(store.isRunning).toBe(false);
  });

  it("toggles visibility only when not animating", () => {
    const store = useFocusTimerStore();

    store.toggleVisibility();
    expect(store.isVisible).toBe(true);

    store.lockToggle();
    store.toggleVisibility();
    expect(store.isVisible).toBe(true);

    store.unlockToggle();
    store.toggleVisibility();
    expect(store.isVisible).toBe(false);
  });

  it("does not fire the alarm after being closed for a long time", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 1, 0);
    store.start();
    store.pause();
    store.isRunning = true;
    store.lastTickTime = Date.now() - 45 * 60 * 1000;

    store.recoverState();

    expect(store.isRunning).toBe(false);
    expect(store.isPaused).toBe(true);
    expect(store.hasFinished).toBe(false);
    expect(store.remainingTime).toBe(60_000);
  });

  it("catches up on elapsed time after a restart while running", () => {
    const store = useFocusTimerStore();
    store.setDuration(0, 1, 0);
    store.start();
    store.pause();
    store.isRunning = true;
    store.lastTickTime = Date.now() - 20_000;

    store.recoverState();

    expect(store.remainingTime).toBe(40_000);
    vi.advanceTimersByTime(1_000);
    expect(store.remainingTime).toBe(39_000);
  });
});
