import { ref, computed } from "vue";
import { defineStore } from "pinia";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export interface LapEntry {
  lapNumber: number;
  elapsed: number;
  split: number;
}

export const useCountClockStore = defineStore(
  "countClock",
  () => {
    const isVisible = ref(false);
    const elapsedTime = ref(0);
    const isRunning = ref(false);
    const isPaused = ref(false);
    const lapTimes = ref<LapEntry[]>([]);
    const lastTickTime = ref<number | null>(null);
    const tickHandle = ref<ReturnType<typeof setInterval> | null>(null);

    // --- computed ---
    const hours = computed(() => Math.floor(elapsedTime.value / 3600000));
    const minutes = computed(() => Math.floor((elapsedTime.value % 3600000) / 60000));
    const seconds = computed(() => Math.floor((elapsedTime.value % 60000) / 1000));
    const ms = computed(() => Math.floor((elapsedTime.value % 1000) / 10));

    const formattedTime = computed(() => {
      const mm = pad2(minutes.value);
      const ss = pad2(seconds.value);
      const cc = pad2(ms.value);
      if (hours.value > 0) {
        return `${hours.value}:${mm}:${ss}.${cc}`;
      }
      return `${mm}:${ss}.${cc}`;
    });

    function formatLapTime(ms: number): string {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const c = Math.floor((ms % 1000) / 10);
      if (h > 0) {
        return `${h}:${pad2(m)}:${pad2(s)}.${pad2(c)}`;
      }
      return `${pad2(m)}:${pad2(s)}.${pad2(c)}`;
    }

    function formatSplitTime(splitMs: number): string {
      const sign = splitMs >= 0 ? "+" : "-";
      const absMs = Math.abs(splitMs);
      const m = Math.floor(absMs / 60000);
      const s = Math.floor((absMs % 60000) / 1000);
      const c = Math.floor((absMs % 1000) / 10);
      if (m > 0) {
        return `${sign}${m}:${pad2(s)}.${pad2(c)}`;
      }
      return `${sign}${s}.${pad2(c)}`;
    }

    // --- internal ---
    function clearTick() {
      if (tickHandle.value !== null) {
        clearInterval(tickHandle.value);
        tickHandle.value = null;
      }
    }

    function doTick() {
      if (lastTickTime.value === null) {
        lastTickTime.value = Date.now();
        return;
      }
      const now = Date.now();
      const delta = now - lastTickTime.value;
      lastTickTime.value = now;
      elapsedTime.value += delta;
    }

    function beginTicking() {
      isRunning.value = true;
      isPaused.value = false;
      lastTickTime.value = Date.now();
      clearTick();
      tickHandle.value = setInterval(doTick, 50);
    }

    // --- actions ---
    function toggleVisibility() {
      isVisible.value = !isVisible.value;
    }

    function startOrPause() {
      if (isRunning.value) {
        // pause
        clearTick();
        isRunning.value = false;
        isPaused.value = true;
      } else {
        // start or resume
        beginTicking();
      }
    }

    function resetOrLap() {
      if (isRunning.value) {
        // record lap
        const prevElapsed = lapTimes.value.length > 0 ? lapTimes.value[0].elapsed : 0;
        const split = elapsedTime.value - prevElapsed;
        const entry: LapEntry = {
          lapNumber: lapTimes.value.length + 1,
          elapsed: elapsedTime.value,
          split,
        };
        lapTimes.value.unshift(entry);
      } else {
        // reset
        clearTick();
        elapsedTime.value = 0;
        lapTimes.value = [];
        isRunning.value = false;
        isPaused.value = false;
        lastTickTime.value = null;
      }
    }

    function recoverState() {
      if (isRunning.value && lastTickTime.value !== null) {
        const now = Date.now();
        const delta = now - lastTickTime.value;
        elapsedTime.value += delta;
        lastTickTime.value = now;
        clearTick();
        tickHandle.value = setInterval(doTick, 50);
      }
    }

    return {
      isVisible,
      elapsedTime,
      isRunning,
      isPaused,
      lapTimes,
      lastTickTime,
      hours,
      minutes,
      seconds,
      ms,
      formattedTime,
      formatLapTime,
      formatSplitTime,
      toggleVisibility,
      startOrPause,
      resetOrLap,
      recoverState,
    };
  },
  {
    persist: {
      key: "flip-clock-count-v1",
      pick: ["isVisible", "elapsedTime", "isRunning", "isPaused", "lapTimes", "lastTickTime"],
    },
  }
);
