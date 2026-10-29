import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { formatLapTime, formatSplitTime } from "@/utils/time";

// A gap larger than this means the process was suspended or closed for a long time.
// Counting it would turn a 10 second stopwatch into hundreds of hours.
const MAX_TICK_GAP_MS = 12 * 60 * 60 * 1000;

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
    let tickHandle: ReturnType<typeof setInterval> | null = null;

    const formattedTime = computed(() => formatLapTime(elapsedTime.value));

    function clearTick() {
      if (tickHandle !== null) {
        clearInterval(tickHandle);
        tickHandle = null;
      }
    }

    function tickInterrupted(): boolean {
      const now = Date.now();
      if (lastTickTime.value === null) {
        lastTickTime.value = now;
        return true;
      }
      if (now - lastTickTime.value > MAX_TICK_GAP_MS) {
        clearTick();
        isRunning.value = false;
        isPaused.value = true;
        lastTickTime.value = null;
        return true;
      }
      return false;
    }

    function doTick() {
      if (tickInterrupted()) return;
      const now = Date.now();
      const delta = now - (lastTickTime.value ?? now);
      lastTickTime.value = now;
      elapsedTime.value += delta;
    }

    function beginTicking() {
      isRunning.value = true;
      isPaused.value = false;
      lastTickTime.value = Date.now();
      clearTick();
      tickHandle = setInterval(doTick, 50);
    }

    function toggleVisibility() {
      isVisible.value = !isVisible.value;
    }

    function startOrPause() {
      if (isRunning.value) {
        clearTick();
        isRunning.value = false;
        isPaused.value = true;
      } else {
        beginTicking();
      }
    }

    function resetOrLap() {
      if (isRunning.value) {
        const prevElapsed = lapTimes.value.length > 0 ? lapTimes.value[0].elapsed : 0;
        const split = elapsedTime.value - prevElapsed;
        const entry: LapEntry = {
          lapNumber: lapTimes.value.length + 1,
          elapsed: elapsedTime.value,
          split,
        };
        lapTimes.value.unshift(entry);
      } else {
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
        if (now - lastTickTime.value > MAX_TICK_GAP_MS) {
          isRunning.value = false;
          isPaused.value = true;
          lastTickTime.value = null;
          return;
        }
        elapsedTime.value += now - lastTickTime.value;
        lastTickTime.value = now;
        clearTick();
        tickHandle = setInterval(doTick, 50);
      }
    }

    return {
      isVisible,
      elapsedTime,
      isRunning,
      isPaused,
      lapTimes,
      lastTickTime,
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
