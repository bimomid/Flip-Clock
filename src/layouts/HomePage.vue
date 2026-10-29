<template>
  <main ref="homeRef" class="home-page-contain">
    <DockRow row="top" />
    <DockRow row="bottom" />

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
    <UpdateDialog />
  </main>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
  type Component,
} from "vue";
import FlipClock from "@/components/FlipClock.vue";
import DockRow from "@/components/DockRow.vue";
import { useFocusTimerStore } from "@/stores/FocusTimer";
import { useCountClockStore } from "@/stores/CountClock";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { useIconsUIStore } from "@/stores/IconsUI";
import { useKeepAwake } from "@/composables/useKeepAwake";
import { useIconDrag } from "@/composables/useIconDrag";
import { DOCK_MARGIN, DOCK_SIDE, PILL_HEIGHT, pillWidth } from "@/config/dock";
import type { DockPosition } from "@/stores/IconsDrag";

function lazy(loader: () => Promise<Component>) {
  return defineAsyncComponent({
    loader,
    delay: 120,
    timeout: 10000,
    onError(error, _retry, fail) {
      // Never leave the view-transition lock on: a failed chunk would otherwise disable
      // every dock icon until the app is restarted.
      unlockToggle();
      console.error("[flip-clock] async view failed to load", error);
      fail();
    },
  });
}

const FocusMode = lazy(() => import("@/components/FocusMode.vue"));
const CountClock = lazy(() => import("@/components/CountClock.vue"));
const PanelPalette = lazy(() => import("@/components/PanelPalette.vue"));
const LanguagePicker = lazy(() => import("@/components/LanguagePicker.vue"));
const TaskWindow = lazy(() => import("@/components/TaskWindow.vue"));
const UpdateDialog = lazy(() => import("@/components/UpdateDialog.vue"));

useKeepAwake();
useIconDrag();

const focusStore = useFocusTimerStore();
const countStore = useCountClockStore();
const ui = useIconsUIStore();

const VIEW_LOCK_FALLBACK_MS = 1500;
let unlockTimer: ReturnType<typeof setTimeout> | null = null;

function lockToggle() {
  focusStore.lockToggle();
  if (unlockTimer) clearTimeout(unlockTimer);
  // Failsafe: the transition unlock must not depend on an animation event that may never fire.
  unlockTimer = setTimeout(unlockToggle, VIEW_LOCK_FALLBACK_MS);
}

function unlockToggle() {
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
  focusStore.unlockToggle();
}

const layoutStore = useIconsLayoutStore();
const homeRef = ref<HTMLElement | null>(null);
const clockArea = ref<HTMLElement | null>(null);

const OVERLAP_MARGIN = 20;

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

  function hits(pos: DockPosition, merged: boolean): boolean {
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

  if (ui.manualIconOverride) return;

  ui.isIconsHidden =
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
  unlockToggle();
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

// Dock icon count changes (drag, layout reset, merge/split) move the pill, so the overlap
// verdict has to be recomputed even though the container size does not change.
watch(
  () => layoutStore.layout,
  () => {
    nextTick(checkOverlap);
  },
  { deep: true }
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
  height: 100dvh;
  padding: calc(24px + var(--safe-top)) calc(24px + var(--safe-right))
    calc(24px + var(--safe-bottom)) calc(24px + var(--safe-left));
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
