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
              previous: isAnimating[digitIndex] && previousDigits[digitIndex] === digitValue
            }"
          >
            <div class="upper">
              <div class="shadow"></div>
              <div class="digit-char">{{ digitValue }}</div>
            </div>
            <div class="lower">
              <div class="shadow"></div>
              <div class="digit-char">{{ digitValue }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
const digitMaxValues = [2, 9, 5, 9, 5, 9] as const
const digitGroups = [
  [0, 1],
  [2, 3],
  [4, 5]
] as const
const digitRanges = digitMaxValues.map((max) => Array.from({ length: max + 1 }, (_, index) => index))
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const currentDigits = ref(getDigitsFromTime())
const previousDigits = ref([...currentDigits.value])
const isAnimating = ref([false, false, false, false, false, false])

let timer: ReturnType<typeof setTimeout> | null = null

function getDigitsFromTime(now = new Date()): number[] {
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  return [
    Math.floor(hours / 10),
    hours % 10,
    Math.floor(minutes / 10),
    minutes % 10,
    Math.floor(seconds / 10),
    seconds % 10
  ]
}

function updateDigitValue(digitIndex: number, nextDigit: number) {
  const currentDigit = currentDigits.value[digitIndex]
  const changed = nextDigit !== currentDigit

  isAnimating.value[digitIndex] = changed
  if (changed) {
    previousDigits.value[digitIndex] = currentDigit
    currentDigits.value[digitIndex] = nextDigit
  }
}

function syncDigitsWithTime(now = new Date()) {
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  updateDigitValue(0, Math.floor(hours / 10))
  updateDigitValue(1, hours % 10)
  updateDigitValue(2, Math.floor(minutes / 10))
  updateDigitValue(3, minutes % 10)
  updateDigitValue(4, Math.floor(seconds / 10))
  updateDigitValue(5, seconds % 10)
}

function scheduleNextTick() {
  if (document.hidden) return
  const delay = 1000 - (Date.now() % 1000)
  timer = setTimeout(tick, delay || 1000)
}

function tick() {
  timer = null
  if (document.hidden) return
  syncDigitsWithTime()
  scheduleNextTick()
}

function stopTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopTimer()
    return
  }
  syncDigitsWithTime()
  if (!timer) scheduleNextTick()
}

onMounted(() => {
  handleVisibilityChange()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopTimer()
})
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

  display: flex;
  flex-wrap: nowrap;
  gap: var(--group-gap);
  width: max-content;
  min-width: max-content;
  max-width: 100vw;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.digit-group {
  display: flex;
  flex: 0 0 auto;
  gap: var(--digit-gap);
  padding: var(--panel-padding-y) var(--panel-padding-x);
  border-radius: var(--panel-radius);
  background: linear-gradient(180deg, rgba(35, 35, 39, 0.95) 0%, rgba(28, 28, 32, 0.95) 100%);
  box-shadow: 0 clamp(14px, 1.6vw, 24px) clamp(26px, 3.2vw, 48px) rgba(0, 0, 0, 0.35);
}

.separator {
  flex: 0 0 auto;
  width: var(--separator-width);
  height: calc(var(--digit-height) * 0.78);
  margin-inline: calc(var(--digit-width) * -0.02);
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}

.separator::before,
.separator::after {
  content: '';
  width: var(--separator-dot-size);
  height: var(--separator-dot-size);
  border-radius: 50%;
  background-color: var(--separator-color);
}

.flipper {
  position: relative;
  width: var(--digit-width);
  height: var(--digit-height);
  font-size: calc(var(--digit-width) * 1.42);
  font-weight: bold;
  line-height: calc(var(--digit-height) - 4px);
  border-radius: calc(var(--digit-width) * 0.12);
  box-shadow: 0 clamp(8px, 1vw, 16px) clamp(18px, 2vw, 32px) rgba(0, 0, 0, 0.35);
  margin: 0;
  padding: 0;
}

.digit {
  z-index: 1;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  perspective: 200px;
  transition: opacity 0.3s;
}

.digit.current,
.digit:first-child {
  z-index: 2;
}

.upper,
.lower {
  z-index: 1;
  position: absolute;
  left: 0;
  width: 100%;
  height: 50%;
  overflow: hidden;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.upper {
  transform-origin: 50% 100%;
  top: 0;
}

.upper::after {
  content: '';
  position: absolute;
  top: calc(var(--digit-height) / 2 - 1px);
  left: 0;
  z-index: 5;
  width: 100%;
  height: 2px;
  background-color: rgba(0, 0, 0, 0.4);
}

.lower {
  transform-origin: 50% 0;
  bottom: 0;
  transition: opacity 0.3s;
}

.digit-char {
  position: absolute;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 200%;
  font-family: 'Cascadia Code', 'Cascadia Mono', 'Roboto Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-variant-numeric: tabular-nums;
  color: #ccc;
  text-shadow: 0 1px 2px #000;
  text-align: center;
  background-color: #333;
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
  z-index: 2;
}

.animating .digit.previous .upper {
  z-index: 2;
  animation: turn-up 0.5s linear both;
}

.animating .digit.current .lower {
  z-index: 2;
  animation: turn-down 0.5s 0.5s linear both;
}

.shadow {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
  will-change: opacity;
}

.animating .digit.previous .upper .shadow,
.animating .digit.previous .lower .shadow {
  animation: show 0.5s linear both;
}

.animating .digit.current .upper .shadow,
.animating .digit.current .lower .shadow {
  animation: hide 0.5s 0.3s linear both;
}

.animating .digit.previous .upper .shadow,
.animating .digit.current .upper .shadow {
  background: linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 1) 100%);
}

.animating .digit.previous .lower .shadow,
.animating .digit.current .lower .shadow {
  background: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.1) 100%);
}

@keyframes turn-down {
  0% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

@keyframes turn-up {
  0% { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
}

@keyframes z-index-jump {
  0% { z-index: 2; }
  5% { z-index: 4; }
  100% { z-index: 4; }
}

@keyframes show {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes hide {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
