<template>
  <div class="clock-container">
    <template v-for="(group, groupIndex) in digitGroups" :key="group[0]">
      <div v-if="groupIndex > 0" class="separator" aria-hidden="true"></div>
      <div class="digit-group">
        <div
          v-for="digitIndex in group"
          :key="digitIndex"
          class="flipper"
          :class="{ animating: isAnimating[digitIndex] }"
        >
          <div
            v-for="digitValue in digitRanges[digitIndex]"
            :key="digitValue"
            class="digit"
            :class="{
              current: currentDigits[digitIndex] === digitValue,
              previous: isAnimating[digitIndex] && previousDigits[digitIndex] === digitValue,
            }"
          >
            <div class="upper">
              <div class="digit-char">{{ digitValue }}</div>
            </div>
            <div class="lower">
              <div class="digit-char">{{ digitValue }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
const digitMaxValues = [2, 9, 5, 9, 5, 9] as const;
const digitGroups = [
  [0, 1],
  [2, 3],
  [4, 5],
] as const;
const digitRanges = digitMaxValues.map((max) =>
  Array.from({ length: max + 1 }, (_, index) => index)
);
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const currentDigits = ref(getDigitsFromTime());
const previousDigits = ref([...currentDigits.value]);
const isAnimating = ref([false, false, false, false, false, false]);

let timer: ReturnType<typeof setTimeout> | null = null;

function getDigitsFromTime(now = new Date()): number[] {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  return [
    Math.floor(hours / 10),
    hours % 10,
    Math.floor(minutes / 10),
    minutes % 10,
    Math.floor(seconds / 10),
    seconds % 10,
  ];
}

function updateDigitValue(digitIndex: number, nextDigit: number) {
  const currentDigit = currentDigits.value[digitIndex];
  const changed = nextDigit !== currentDigit;

  isAnimating.value[digitIndex] = changed;
  if (changed) {
    previousDigits.value[digitIndex] = currentDigit;
    currentDigits.value[digitIndex] = nextDigit;
  }
}

function syncDigitsWithTime(now = new Date()) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  updateDigitValue(0, Math.floor(hours / 10));
  updateDigitValue(1, hours % 10);
  updateDigitValue(2, Math.floor(minutes / 10));
  updateDigitValue(3, minutes % 10);
  updateDigitValue(4, Math.floor(seconds / 10));
  updateDigitValue(5, seconds % 10);
}

function scheduleNextTick() {
  if (document.hidden) return;
  const delay = 1000 - (Date.now() % 1000);
  timer = setTimeout(tick, delay || 1000);
}

function tick() {
  timer = null;
  if (document.hidden) return;
  syncDigitsWithTime();
  scheduleNextTick();
}

function stopTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopTimer();
    return;
  }
  syncDigitsWithTime();
  if (!timer) scheduleNextTick();
}

onMounted(() => {
  handleVisibilityChange();
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  stopTimer();
});
</script>

<style scoped>
.clock-container {
  --digit-width: clamp(34px, min(calc((100vw - 32px) / 8.34), calc((100vh - 84px) / 2.3)), 196px);
  --digit-height: calc(var(--digit-width) * 1.36);
  --digit-gap: calc(var(--digit-width) * 0.14);
  --panel-padding-x: calc(var(--digit-width) * 0.24);
  --panel-padding-y: calc(var(--digit-width) * 0.18);
  --panel-radius: calc(var(--digit-width) * 0.2);
  --group-gap: calc(var(--digit-width) * 0.1);
  --separator-width: calc(var(--digit-width) * 0.16);
  --separator-dot-size: calc(var(--digit-width) * 0.14);
  --separator-color: #333;
  --panel-top-color: rgb(35 35 39 / 95%);
  --panel-bottom-color: rgb(28 28 32 / 95%);
  --digit-bg-color: #333;
  --digit-text-color: #ccc;
  --digit-divider-color: rgb(0 0 0 / 40%);

  display: flex;
  flex-wrap: nowrap;
  gap: var(--group-gap);
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: 100vw;
  margin: 0 auto;
}

.digit-group {
  display: flex;
  flex: 0 0 auto;
  gap: var(--digit-gap);
  padding: var(--panel-padding-y) var(--panel-padding-x);
  background: linear-gradient(180deg, var(--panel-top-color) 0%, var(--panel-bottom-color) 100%);
  border-radius: var(--panel-radius);
}

.separator {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  width: var(--separator-width);
  height: calc(var(--digit-height) * 0.78);
  margin-inline: calc(var(--digit-width) * -0.02);
}

.separator::before,
.separator::after {
  width: var(--separator-dot-size);
  height: var(--separator-dot-size);
  content: "";
  background-color: var(--separator-color);
  border-radius: 50%;
}

.flipper {
  position: relative;
  width: var(--digit-width);
  height: var(--digit-height);
  font-size: calc(var(--digit-width) * 1.42);
  font-weight: bold;
  line-height: calc(var(--digit-height) - 4px);
  border-radius: calc(var(--digit-width) * 0.12);
}

.digit {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  perspective: calc(var(--digit-height) * 1.8);
}

.digit.current {
  z-index: 2;
}

.upper,
.lower {
  position: absolute;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 50%;
  overflow: hidden;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.upper {
  top: 0;
  transform-origin: 50% 100%;
}

.upper::after {
  position: absolute;
  top: calc(var(--digit-height) / 2 - 1px);
  left: 0;
  z-index: 5;
  width: 100%;
  height: 2px;
  content: "";
  background-color: var(--digit-divider-color);
}

.lower {
  bottom: 0;
  transform-origin: 50% 0;
}

.digit-char {
  position: absolute;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 200%;
  font-family:
    "Cascadia Code", "Cascadia Mono", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-variant-numeric: tabular-nums;
  color: var(--digit-text-color);
  text-align: center;
  background-color: var(--digit-bg-color);
  border-radius: calc(var(--digit-width) * 0.12);
}

.upper .digit-char {
  top: 0;
}

.lower .digit-char {
  bottom: 0;
}

.animating .digit.previous {
  z-index: 3;
}

.animating .digit.current {
  animation: z-index-jump 0.5s 0.5s linear both;
}

.animating .digit.previous .upper {
  z-index: 2;
  animation: turn-up 0.5s linear both;
}

.animating .digit.current .lower {
  z-index: 2;
  animation: turn-down 0.5s 0.5s linear both;
}

@keyframes turn-down {
  0% {
    transform: rotateX(90deg);
  }

  100% {
    transform: rotateX(0deg);
  }
}

@keyframes turn-up {
  0% {
    transform: rotateX(0deg);
  }

  100% {
    transform: rotateX(-90deg);
  }
}

@keyframes z-index-jump {
  0% {
    z-index: 2;
  }

  5% {
    z-index: 4;
  }

  100% {
    z-index: 4;
  }
}
</style>
