<template>
  <div class="count-clock-wrapper" :class="{ 'has-hours': hasHours }">
    <div class="time-display">
      <template v-for="(chunk, ci) in timeChunks" :key="ci">
        <span v-if="chunk.sep" class="time-sep">{{ chunk.sep }}</span>
        <span v-else class="digit-panel">{{ chunk.char }}</span>
      </template>
    </div>

    <div class="count-controls">
      <button class="count-btn" @click="store.startOrPause()">
        {{ store.isRunning ? $t("countClock.pause") : $t("countClock.start") }}
      </button>
      <button class="count-btn" @click="store.resetOrLap()">
        {{ store.isRunning ? $t("countClock.lap") : $t("countClock.reset") }}
      </button>
    </div>

    <div v-if="store.lapTimes.length > 0" class="lap-area">
      <div ref="lapContainer" class="lap-container">
        <div v-for="lap in store.lapTimes" :key="lap.lapNumber" class="lap-row">
          <span class="lap-num">#{{ lap.lapNumber }}</span>
          <span class="lap-elapsed">{{ store.formatLapTime(lap.elapsed) }}</span>
          <span class="lap-split" :class="lap.split >= 0 ? 'split-plus' : 'split-minus'">
            {{ store.formatSplitTime(lap.split) }}
          </span>
        </div>
      </div>
      <div v-if="hiddenLapCount > 0" class="lap-more">
        {{ $t("countClock.moreLaps", { count: hiddenLapCount }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCountClockStore } from "@/stores/CountClock";

const store = useCountClockStore();

const hasHours = computed(() => store.elapsedTime >= 3600000);

interface TimeChunk {
  char?: string;
  sep?: string;
}

const timeChunks = computed<TimeChunk[]>(() => {
  const t = store.formattedTime;
  const parts: TimeChunk[] = [];
  for (const ch of t) {
    if (ch === ":" || ch === ".") {
      parts.push({ sep: ch });
    } else {
      parts.push({ char: ch });
    }
  }
  return parts;
});

const lapContainer = ref<HTMLElement | null>(null);
const lapRowHeight = ref(0);
const lapContainerHeight = ref(0);

function measureLapRow() {
  const el = lapContainer.value;
  if (!el) return;
  lapContainerHeight.value = el.clientHeight;
  lapRowHeight.value = el.querySelector<HTMLElement>(".lap-row")?.offsetHeight ?? 0;
}

const visibleLapCount = computed(() => {
  if (lapRowHeight.value === 0) return store.lapTimes.length;
  return Math.max(1, Math.floor(lapContainerHeight.value / lapRowHeight.value));
});

const hiddenLapCount = computed(() => Math.max(0, store.lapTimes.length - visibleLapCount.value));

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  store.recoverState();
  measureLapRow();
  if (lapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      measureLapRow();
    });
    resizeObserver.observe(lapContainer.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  () => store.lapTimes.length,
  () => {
    nextTick(measureLapRow);
  }
);
</script>

<style scoped>
.count-clock-wrapper {
  /* 8 digits + 2 separators + 9 gaps = 10.08 digit widths. */
  --digit-width: clamp(32px, min(calc((100vw - 48px) / 10.1), calc((100vh - 260px) / 1.65)), 96px);
  --digit-height: calc(var(--digit-width) * 1.36);
  --digit-gap: calc(var(--digit-width) * 0.12);
  --panel-radius: calc(var(--digit-width) * 0.16);
  --sep-size: calc(var(--digit-width) * 0.78);

  display: flex;
  flex-direction: column;
  gap: calc(var(--digit-width) * 0.42);
  align-items: center;
  width: max-content;
  max-width: calc(100vw - 48px);
  margin: 0 auto;
}

/* Past one hour the readout grows to H:MM:SS.cc (10 digits, 3 separators, 12 gaps). */
.count-clock-wrapper.has-hours {
  --digit-width: clamp(30px, min(calc((100vw - 48px) / 11.94), calc((100vh - 260px) / 1.65)), 92px);
}

.time-display {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--digit-gap);
  align-items: center;
  justify-content: center;
}

.digit-panel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--digit-width);
  height: var(--digit-height);
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: calc(var(--digit-width) * 1.42);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--flip-digit-text);
  background: var(--flip-digit-bg);
  border-radius: var(--panel-radius);
}

.time-sep {
  width: calc(var(--digit-width) * 0.5);
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: var(--sep-size);
  font-weight: 700;
  line-height: 1;
  color: var(--flip-separator);
  text-align: center;
}

.count-controls {
  display: flex;
  gap: calc(var(--digit-width) * 0.32);
  align-items: center;
}

.count-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: max(80px, calc(var(--digit-width) * 1.6));
  height: max(34px, calc(var(--digit-width) * 0.8));
  padding: 0 max(12px, calc(var(--digit-width) * 0.42));
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: max(13px, calc(var(--digit-width) * 0.28));
  font-weight: 600;
  color: var(--ring-progress);
  cursor: pointer;
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
  border-radius: max(16px, calc(var(--digit-width) * 0.4));
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.count-btn:hover {
  border-color: var(--dock-item-border-hover);
  box-shadow: 0 0 0 calc(var(--digit-width) * 0.05) hsl(var(--s-h) var(--s-s) var(--s-l) / 20%);
  transform: scale(1.1);
}

.lap-area {
  display: flex;
  flex-direction: column;
  gap: calc(var(--digit-width) * 0.12);
  width: calc(var(--digit-width) * 7.6);
  max-width: calc(100vw - 48px);
}

.lap-more {
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: max(11px, calc(var(--digit-width) * 0.18));
  color: var(--app-text);
  text-align: center;
  opacity: 0.55;
}

.lap-container {
  max-height: min(calc(var(--digit-height) * 2.6), 35vh);
  overflow-y: auto;
  background: hsl(var(--p-h) var(--p-s) calc(var(--p-l) - 2%));
  border: 1px solid var(--dock-item-border);
  border-radius: calc(var(--digit-width) * 0.2);
}

.lap-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: max(28px, calc(var(--digit-width) * 0.5));
  padding: 0 calc(var(--digit-width) * 0.22);
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: max(12px, calc(var(--digit-width) * 0.22));
  font-variant-numeric: tabular-nums;
  color: var(--app-text);
  border-bottom: 1px solid hsl(var(--p-h) var(--p-s) calc(var(--p-l) - 6%));
}

.lap-row:last-child {
  border-bottom: none;
}

.lap-num {
  flex: 0 0 auto;
  width: calc(var(--digit-width) * 0.8);
  font-weight: 600;
  opacity: 0.7;
}

.lap-elapsed {
  flex: 1;
  font-weight: 500;
}

.lap-split {
  flex: 0 0 auto;
  font-size: max(11px, calc(var(--digit-width) * 0.2));
  font-weight: 600;
}

.split-plus {
  color: #22c55e;
}

.split-minus {
  color: #ef4444;
}

.lap-container::-webkit-scrollbar {
  width: 4px;
}

.lap-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 0 calc(var(--digit-width) * 0.2) calc(var(--digit-width) * 0.2) 0;
}

.lap-container::-webkit-scrollbar-thumb {
  background: var(--dock-item-border);
  border-radius: 2px;
}

.lap-container::-webkit-scrollbar-thumb:hover {
  background: var(--dock-item-border-hover);
}
</style>
