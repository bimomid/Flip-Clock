import { ref, computed } from "vue";
import { defineStore } from "pinia";
import alarmClockMp3Src from "@/assets/mp3/AlarmClock.mp3";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

let alarmAudio: HTMLAudioElement | null = null;

function getAlarmAudio(): HTMLAudioElement {
  if (!alarmAudio) {
    alarmAudio = new Audio(alarmClockMp3Src);
    alarmAudio.volume = 0.6;
    alarmAudio.loop = true;
  }
  return alarmAudio;
}

export const useFocusTimerStore = defineStore(
  "focusTimer",
  () => {
    const isVisible = ref(false);
    const isAnimating = ref(false);
    const totalDuration = ref(25 * 60 * 1000);
    const remainingTime = ref(25 * 60 * 1000);
    const isRunning = ref(false);
    const isPaused = ref(false);
    const hasFinished = ref(false);
    const lastTickTime = ref<number | null>(null);
    const tickHandle = ref<ReturnType<typeof setInterval> | null>(null);

    // --- computed ---
    const progress = computed(() => {
      if (totalDuration.value <= 0) return 0;
      const p = 1 - remainingTime.value / totalDuration.value;
      return Math.max(0, Math.min(1, p));
    });

    const hours = computed(() => Math.floor(remainingTime.value / 3600000));
    const minutes = computed(() => Math.floor((remainingTime.value % 3600000) / 60000));
    const seconds = computed(() => Math.floor((remainingTime.value % 60000) / 1000));

    const formattedTime = computed(
      () => `${pad2(hours.value)}:${pad2(minutes.value)}:${pad2(seconds.value)}`
    );

    const totalHours = computed(() => Math.floor(totalDuration.value / 3600000));
    const totalMinutes = computed(() => Math.floor((totalDuration.value % 3600000) / 60000));
    const totalSeconds = computed(() => Math.floor((totalDuration.value % 60000) / 1000));

    const formattedTotal = computed(
      () => `${pad2(totalHours.value)}:${pad2(totalMinutes.value)}:${pad2(totalSeconds.value)}`
    );

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
      const elapsed = now - lastTickTime.value;
      lastTickTime.value = now;
      remainingTime.value = Math.max(0, remainingTime.value - elapsed);
      if (remainingTime.value <= 0) {
        clearTick();
        isRunning.value = false;
        isPaused.value = false;
        hasFinished.value = true;
        isVisible.value = true;
        remainingTime.value = totalDuration.value;
        startAlarmInternal();
      }
    }

    function startAlarmInternal() {
      const audio = getAlarmAudio();
      if (!audio.paused) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }

    function stopAlarmInternal() {
      const audio = getAlarmAudio();
      audio.pause();
      audio.currentTime = 0;
      hasFinished.value = false;
    }

    // --- actions ---
    function toggleVisibility() {
      if (isAnimating.value) return;
      isVisible.value = !isVisible.value;
    }

    function setDuration(h: number, m: number, s: number) {
      if (isRunning.value || isPaused.value) {
        clearTick();
        isRunning.value = false;
        isPaused.value = false;
      }
      stopAlarmInternal();
      const ms = (h * 3600 + m * 60 + s) * 1000;
      totalDuration.value = ms;
      remainingTime.value = ms;
      hasFinished.value = false;
      lastTickTime.value = null;
    }

    function beginTicking() {
      stopAlarmInternal();
      isRunning.value = true;
      isPaused.value = false;
      hasFinished.value = false;
      lastTickTime.value = Date.now();
      clearTick();
      tickHandle.value = setInterval(doTick, 200);
    }

    function start() {
      if (remainingTime.value <= 0) return;
      beginTicking();
    }

    function pause() {
      if (!isRunning.value) return;
      clearTick();
      isRunning.value = false;
      isPaused.value = true;
    }

    function resume() {
      if (!isPaused.value) return;
      beginTicking();
    }

    function reset() {
      clearTick();
      isRunning.value = false;
      isPaused.value = false;
      stopAlarmInternal();
      remainingTime.value = totalDuration.value;
      lastTickTime.value = null;
    }

    function stopAlarm() {
      stopAlarmInternal();
    }

    function recoverState() {
      if (isRunning.value && lastTickTime.value !== null) {
        const now = Date.now();
        const elapsed = now - lastTickTime.value;
        remainingTime.value = Math.max(0, remainingTime.value - elapsed);
        if (remainingTime.value <= 0) {
          isRunning.value = false;
          isPaused.value = false;
          hasFinished.value = true;
          isVisible.value = true;
          startAlarmInternal();
        } else {
          lastTickTime.value = now;
          clearTick();
          tickHandle.value = setInterval(doTick, 200);
        }
      } else if (hasFinished.value) {
        isVisible.value = true;
        startAlarmInternal();
      }
    }

    function lockToggle() {
      isAnimating.value = true;
    }
    function unlockToggle() {
      isAnimating.value = false;
    }

    return {
      isVisible,
      isAnimating,
      totalDuration,
      remainingTime,
      isRunning,
      isPaused,
      hasFinished,
      lastTickTime,
      progress,
      formattedTime,
      totalHours,
      totalMinutes,
      totalSeconds,
      formattedTotal,
      toggleVisibility,
      lockToggle,
      unlockToggle,
      setDuration,
      start,
      pause,
      resume,
      reset,
      stopAlarm,
      recoverState,
    };
  },
  {
    persist: {
      key: "flip-clock-focus-v1",
      pick: [
        "totalDuration",
        "remainingTime",
        "isRunning",
        "isPaused",
        "hasFinished",
        "lastTickTime",
        "isVisible",
      ],
    },
  }
);
