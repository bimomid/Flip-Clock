<template>
  <main ref="homeRef" class="home-page-contain">
    <DockRow row="top" />
    <DockRow row="bottom" />
    <IconsConfig />

    <div ref="clockArea" class="clock-area">
      <Transition
        name="clock-switch"
        mode="out-in"
        @before-leave="lockToggle"
        @after-enter="unlockToggle"
      >
        <CountClock v-if="countStore.isVisible" key="count" />
        <FocusMode v-else-if="focusStore.isVisible" key="focus" />
        <FlipClock v-else key="clock" />
      </Transition>
    </div>
    <PanelPalette />
    <LanguagePicker />
    <TaskWindow />
  </main>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import FlipClock from "@/components/FlipClock.vue";
import FocusMode from "@/components/FocusMode.vue";
import CountClock from "@/components/CountClock.vue";
import IconsConfig, { isIconsHidden, manualIconOverride } from "@/components/IconsConfig.vue";
import DockRow from "@/components/DockRow.vue";
import PanelPalette from "@/components/PanelPalette.vue";
import LanguagePicker from "@/components/LanguagePicker.vue";
import TaskWindow from "@/components/TaskWindow.vue";
import { useFocusTimerStore } from "@/stores/FocusTimer";
import { useCountClockStore } from "@/stores/CountClock";
import { useIconsLayoutStore } from "@/stores/IconsLayout";

const focusStore = useFocusTimerStore();
const countStore = useCountClockStore();

function lockToggle() {
  focusStore.lockToggle();
}
function unlockToggle() {
  focusStore.unlockToggle();
}

const layoutStore = useIconsLayoutStore();
const homeRef = ref<HTMLElement | null>(null);
const clockArea = ref<HTMLElement | null>(null);

const ICON_SIZE = 38;
const ICON_GAP = 12;
const PILL_PAD = 14;
const PILL_HEIGHT = 58;
const DOCK_MARGIN = 35;
const DOCK_SIDE = 20;
const OVERLAP_MARGIN = 20;

function pillWidth(count: number): number {
  if (count === 0) return 0;
  return PILL_PAD * 2 + 2 + count * ICON_SIZE + (count - 1) * ICON_GAP;
}

function checkOverlap() {
  const container = homeRef.value;
  const clock = clockArea.value;
  if (!container || !clock) return;

  const cr = container.getBoundingClientRect();
  const r = clock.getBoundingClientRect();
  const vw = cr.width;
  const vh = cr.height;
  const ct = r.top - cr.top;
  const cl = r.left - cr.left;
  const cr_ = r.right - cr.left;
  const cb = r.bottom - cr.top;

  const layout = layoutStore.layout;

  type DockPos = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom";

  function hits(pos: DockPos, merged: boolean): boolean {
    const count = layout[pos].length;
    if (count === 0) return false;

    const pw = merged ? vw - DOCK_SIDE * 2 : pillWidth(count);

    let dt: number, dl: number, dr: number, db: number;

    if (pos === "top-left") {
      dt = DOCK_MARGIN;
      dl = DOCK_SIDE;
      dr = DOCK_SIDE + pw;
      db = DOCK_MARGIN + PILL_HEIGHT;
    } else if (pos === "top-right") {
      dt = DOCK_MARGIN;
      dl = vw - DOCK_SIDE - pw;
      dr = vw - DOCK_SIDE;
      db = DOCK_MARGIN + PILL_HEIGHT;
    } else if (pos === "bottom-left") {
      dt = vh - DOCK_MARGIN - PILL_HEIGHT;
      dl = DOCK_SIDE;
      dr = DOCK_SIDE + pw;
      db = vh - DOCK_MARGIN;
    } else if (pos === "bottom-right") {
      dt = vh - DOCK_MARGIN - PILL_HEIGHT;
      dl = vw - DOCK_SIDE - pw;
      dr = vw - DOCK_SIDE;
      db = vh - DOCK_MARGIN;
    } else if (pos === "top") {
      dt = DOCK_MARGIN;
      dl = DOCK_SIDE;
      dr = vw - DOCK_SIDE;
      db = DOCK_MARGIN + PILL_HEIGHT;
    } else {
      dt = vh - DOCK_MARGIN - PILL_HEIGHT;
      dl = DOCK_SIDE;
      dr = vw - DOCK_SIDE;
      db = vh - DOCK_MARGIN;
    }

    return (
      cr_ + OVERLAP_MARGIN > dl &&
      cl - OVERLAP_MARGIN < dr &&
      cb + OVERLAP_MARGIN > dt &&
      ct - OVERLAP_MARGIN < db
    );
  }

  if (manualIconOverride.value) return;

  isIconsHidden.value =
    hits("top-left", false) ||
    hits("top-right", false) ||
    hits("bottom-left", false) ||
    hits("bottom-right", false) ||
    hits("top", true) ||
    hits("bottom", true);
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (homeRef.value) {
    resizeObserver = new ResizeObserver(() => checkOverlap());
    resizeObserver.observe(homeRef.value);
  }
  nextTick(checkOverlap);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  () => [countStore.isVisible, focusStore.isVisible],
  () => {
    nextTick(checkOverlap);
  }
);

watch(
  () => countStore.lapTimes.length,
  () => {
    nextTick(checkOverlap);
  }
);
</script>

<style scoped>
.home-page-contain {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  padding: 24px;
}

.clock-switch-enter-active,
.clock-switch-leave-active {
  transition:
    opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.clock-switch-enter-from {
  opacity: 0;
  transform: scale(0.94);
}

.clock-switch-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
