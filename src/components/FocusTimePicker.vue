<template>
  <div class="picker-backdrop" @click.self="$emit('close')">
    <div class="picker-panel">
      <div class="picker-columns">
        <template v-for="(col, colIdx) in columns" :key="col.key">
          <span v-if="colIdx > 0" class="picker-colon">:</span>
          <div
            class="picker-column"
            @wheel.prevent="onWheel(col.key, $event)"
            @pointerdown="onDragStart(col.key, $event)"
          >
            <div
              class="picker-list"
              :class="{ 'no-transition': noTransition }"
              :style="{ transform: `translateY(${col.offset}px)` }"
            >
              <button
                v-for="(v, i) in col.tripled"
                :key="i"
                class="picker-item"
                :class="{ selected: i === listIndex[col.key] }"
                @click="onClickItem(col.key, i)"
              >
                {{ pad2(v) }}
              </button>
            </div>
            <div class="picker-highlight" />
          </div>
        </template>
      </div>

      <button class="picker-confirm" @click="onConfirm">确认</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onBeforeUnmount } from "vue";
import { pad2 } from "@/stores/FocusTimer";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const TRANSITION_MS = 220;

const props = defineProps<{
  hours: number;
  minutes: number;
  seconds: number;
}>();

const emit = defineEmits<{
  change: [{ hours: number; minutes: number; seconds: number }];
  close: [];
}>();

// Base value arrays
const hourValues = Array.from({ length: 25 }, (_, i) => i);
const minuteValues = Array.from({ length: 60 }, (_, i) => i);
const secondValues = Array.from({ length: 60 }, (_, i) => i);

// Tripled for continuous scrolling
const tripledHours = [...hourValues, ...hourValues, ...hourValues];
const tripledMinutes = [...minuteValues, ...minuteValues, ...minuteValues];
const tripledSeconds = [...secondValues, ...secondValues, ...secondValues];

const MAX = { hours: 25, minutes: 60, seconds: 60 };

// Position in tripled list — starts at middle copy
const listIndex = reactive({
  hours: MAX.hours + props.hours,
  minutes: MAX.minutes + props.minutes,
  seconds: MAX.seconds + props.seconds,
});

const noTransition = ref(false);

let recenterTimer: ReturnType<typeof setTimeout> | null = null;

function colValue(col: "hours" | "minutes" | "seconds"): number {
  const max = MAX[col];
  return ((listIndex[col] % max) + max) % max;
}

function colOffset(col: "hours" | "minutes" | "seconds"): number {
  return -(listIndex[col] * ITEM_HEIGHT) + Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
}

type ColKey = "hours" | "minutes" | "seconds";

const columns = computed<{ key: ColKey; tripled: number[]; offset: number }[]>(() => [
  { key: "hours" as const, tripled: tripledHours, offset: colOffset("hours") },
  { key: "minutes" as const, tripled: tripledMinutes, offset: colOffset("minutes") },
  { key: "seconds" as const, tripled: tripledSeconds, offset: colOffset("seconds") },
]);

function recenterOne(col: "hours" | "minutes" | "seconds") {
  const idx = listIndex[col];
  const max = MAX[col];
  const localIdx = ((idx % max) + max) % max;
  const mid = MAX[col];
  if (idx < max || idx >= 2 * max) {
    listIndex[col] = mid + localIdx;
  }
}

function recenterAll() {
  recenterOne("hours");
  recenterOne("minutes");
  recenterOne("seconds");
}

function scheduleRecenter() {
  if (recenterTimer) clearTimeout(recenterTimer);
  recenterTimer = setTimeout(() => {
    noTransition.value = true;
    recenterAll();
    requestAnimationFrame(() => {
      noTransition.value = false;
    });
    recenterTimer = null;
  }, TRANSITION_MS + 20);
}

function shiftIndex(col: "hours" | "minutes" | "seconds", delta: number) {
  listIndex[col] += delta;
}

onBeforeUnmount(() => {
  if (recenterTimer) clearTimeout(recenterTimer);
});

// --- interactions ---

function onClickItem(col: "hours" | "minutes" | "seconds", targetIdx: number) {
  listIndex[col] = targetIdx;
  scheduleRecenter();
}

function onWheel(col: "hours" | "minutes" | "seconds", e: WheelEvent) {
  shiftIndex(col, e.deltaY > 0 ? 1 : -1);
  scheduleRecenter();
}

// --- drag ---
const dragCol = ref<"hours" | "minutes" | "seconds" | null>(null);
let dragStartY = 0;
let dragStartIdx = 0;

function onDragStart(col: "hours" | "minutes" | "seconds", e: PointerEvent) {
  dragCol.value = col;
  dragStartY = e.clientY;
  dragStartIdx = listIndex[col];
  noTransition.value = true;
  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
}

function onDragMove(e: PointerEvent) {
  if (!dragCol.value) return;
  const dy = dragStartY - e.clientY;
  const steps = Math.round(dy / ITEM_HEIGHT);
  listIndex[dragCol.value] = dragStartIdx + steps;
}

function onDragEnd() {
  dragCol.value = null;
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  noTransition.value = false;
  scheduleRecenter();
}

function onConfirm() {
  emit("change", {
    hours: colValue("hours"),
    minutes: colValue("minutes"),
    seconds: colValue("seconds"),
  });
}
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(0deg 0% 0% / 35%);
}

.picker-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 16px;
  box-shadow: 0 12px 40px hsl(0deg 0% 0% / 28%);
}

.picker-columns {
  display: flex;
  gap: 6px;
  align-items: center;
}

.picker-column {
  position: relative;
  width: 64px;
  height: 180px;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
  background: var(--dock-item-bg);
  border-radius: 10px;
}

.picker-column:active {
  cursor: grabbing;
}

.picker-list {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.picker-list.no-transition {
  transition: none;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  padding: 0;
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: 20px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--dock-item-color);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  transition: color 0.15s ease;
}

.picker-item.selected {
  font-weight: 700;
  color: var(--ring-progress);
}

.picker-item:hover {
  color: var(--ring-progress);
}

.picker-highlight {
  position: absolute;
  top: 50%;
  right: 4px;
  left: 4px;
  height: 36px;
  pointer-events: none;
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 6%);
  border-top: 1px solid var(--dock-item-border);
  border-bottom: 1px solid var(--dock-item-border);
  border-radius: 6px;
  transform: translateY(-50%);
}

.picker-colon {
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: 28px;
  font-weight: 700;
  color: var(--app-text);
  user-select: none;
}

.picker-confirm {
  align-self: center;
  padding: 8px 36px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: var(--ring-progress);
  border: none;
  border-radius: 10px;
  transition: opacity 0.15s ease;
}

.picker-confirm:hover {
  opacity: 0.85;
}
</style>
