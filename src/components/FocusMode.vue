<template>
  <div class="focus-mode-wrapper">
    <FocusRing
      :progress="store.progress"
      :formatted-time="store.formattedTime"
      :has-finished="store.hasFinished"
      @click-center="onRingClick"
    />

    <Transition name="picker">
      <FocusTimePicker
        v-if="isPickerOpen"
        :hours="pickerHours"
        :minutes="pickerMinutes"
        :seconds="pickerSeconds"
        @change="onPickerChange"
        @close="isPickerOpen = false"
      />
    </Transition>

    <div class="focus-controls">
      <button class="focus-btn" @click="onPlayPause">
        <span v-html="playPauseIcon" />
      </button>
      <button
        class="focus-btn focus-time-btn"
        :class="{ disabled: store.isRunning }"
        @click="togglePicker"
      >
        {{ store.formattedTotal }}
      </button>
      <button class="focus-btn" @click="store.reset()">
        <span v-html="resetSvg" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useFocusTimerStore } from "@/stores/FocusTimer";
import FocusRing from "@/components/FocusRing.vue";
import FocusTimePicker from "@/components/FocusTimePicker.vue";
import continueSvg from "@/assets/svg/Func-Continue.svg?raw";
import pauseSvg from "@/assets/svg/Func-Pause.svg?raw";
import resetSvg from "@/assets/svg/Func-Reset.svg?raw";

const store = useFocusTimerStore();
const isPickerOpen = ref(false);

const playPauseIcon = computed(() =>
  store.isRunning && !store.hasFinished ? pauseSvg : continueSvg
);

const pickerHours = computed(() => store.totalHours);
const pickerMinutes = computed(() => store.totalMinutes);
const pickerSeconds = computed(() => store.totalSeconds);

function onPlayPause(e: MouseEvent) {
  if (store.hasFinished) {
    e.stopPropagation();
    store.start();
    return;
  }
  if (store.isRunning) {
    store.pause();
    return;
  }
  if (store.isPaused) {
    store.resume();
    return;
  }
  store.start();
}

function onRingClick() {
  if (store.hasFinished) {
    store.stopAlarm();
    return;
  }
  togglePicker();
}

function togglePicker() {
  if (store.isRunning) return;
  isPickerOpen.value = !isPickerOpen.value;
}

function onPickerChange(v: { hours: number; minutes: number; seconds: number }) {
  store.setDuration(v.hours, v.minutes, v.seconds);
  isPickerOpen.value = false;
}

function onDocumentClick() {
  if (store.hasFinished) {
    store.stopAlarm();
  }
}

watch(
  () => store.hasFinished,
  (alarming) => {
    if (alarming) {
      document.addEventListener("click", onDocumentClick);
    } else {
      document.removeEventListener("click", onDocumentClick);
    }
  }
);

onMounted(() => {
  store.recoverState();
  if (store.hasFinished) {
    document.addEventListener("click", onDocumentClick);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<style scoped>
.focus-mode-wrapper {
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: center;
}

.focus-controls {
  display: flex;
  gap: 18px;
  align-items: center;
}

.focus-btn {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 10px;
  cursor: pointer;
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
  border-radius: 50%;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.focus-btn:hover {
  border-color: var(--dock-item-border-hover);
  box-shadow: 0 0 0 3px hsl(var(--s-h) var(--s-s) var(--s-l) / 20%);
  transform: scale(1.1);
}

.focus-btn :deep(svg) {
  width: 100%;
  height: 100%;
  color: var(--ring-progress);
}

.focus-time-btn {
  width: auto;
  min-width: 120px;
  padding: 10px 24px;
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--app-text);
  border-radius: 24px;
}

.focus-time-btn.disabled {
  cursor: default;
  box-shadow: none !important;
  opacity: 0.4;
  transform: none !important;
}

.focus-time-btn.disabled:hover {
  border-color: var(--dock-item-border);
  box-shadow: none;
  transform: none;
}

/* picker transition */
.picker-enter-active,
.picker-leave-active {
  transition:
    opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.picker-enter-from,
.picker-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
