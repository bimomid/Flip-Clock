<template>
  <div ref="rowEl" class="dock-row-container" :class="{ 'is-animating': isAnimating }">
    <IconsDock
      v-if="isMerged"
      key="merged"
      :position="mergedPos"
      :drop-zones="[mergedPos]"
      :merged-icons="combinedIcons"
      fluid
    />
    <template v-else>
      <IconsDock :position="leftPos" :drop-zones="[leftPos]" />
      <IconsDock :position="rightPos" :drop-zones="[rightPos]" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import type { DockPosition } from "@/stores/IconsDrag";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { defaultLayout as defaultLayoutMap } from "@/config/dock-layout";
import { pillWidth } from "@/config/dock";
import { useIconsUIStore } from "@/stores/IconsUI";
import IconsDock from "@/components/IconsDock.vue";

const props = defineProps<{
  row: "top" | "bottom";
}>();

const layoutStore = useIconsLayoutStore();
const ui = useIconsUIStore();

const rowEl = ref<HTMLElement | null>(null);
const isMerged = ref(false);
const isAnimating = ref(false);

const leftPos: DockPosition = props.row === "top" ? "top-left" : "bottom-left";
const rightPos: DockPosition = props.row === "top" ? "top-right" : "bottom-right";
const mergedPos: DockPosition = props.row === "top" ? "top" : "bottom";

const defaultLeftSet = new Set(defaultLayoutMap[leftPos]);

const combinedIcons = computed(() => layoutStore.iconsAt(mergedPos));

let observer: ResizeObserver | null = null;

const COLLISION_THRESHOLD = 24;
const UNMERGE_HYSTERESIS = 60;

function getAvailableWidth(): number {
  const container = rowEl.value?.closest(".home-page-contain") as HTMLElement;
  if (!container) return Infinity;
  return container.clientWidth - 40;
}

function calcPillWidth(count: number): number {
  return pillWidth(count);
}

function measureSplitGap(): number {
  if (!rowEl.value) return Infinity;

  const leftCount = layoutStore.iconsAt(leftPos).length;
  const rightCount = layoutStore.iconsAt(rightPos).length;
  if (leftCount === 0 && rightCount === 0) return Infinity;

  const pillW = (pos: DockPosition, count: number) => {
    if (ui.isIconsHidden) return calcPillWidth(count);
    const row = rowEl.value!.querySelector(
      `[data-position="${pos}"] .toolbar-dock-row`
    ) as HTMLElement | null;
    return row?.scrollWidth ?? 0;
  };

  return getAvailableWidth() - pillW(leftPos, leftCount) - pillW(rightPos, rightCount);
}

function estimateSplitWidth(): number {
  const merged = layoutStore.iconsAt(mergedPos);
  const leftIcons = merged.filter((id) => defaultLeftSet.has(id));
  const rightIcons = merged.filter((id) => !defaultLeftSet.has(id));

  return calcPillWidth(leftIcons.length) + calcPillWidth(rightIcons.length);
}

function checkCollision() {
  if (isAnimating.value) return;

  if (!isMerged.value) {
    const gap = measureSplitGap();
    if (gap < COLLISION_THRESHOLD) {
      doMerge();
    }
  } else {
    const mergedCount = layoutStore.iconsAt(mergedPos).length;
    const leftCount = layoutStore.iconsAt(leftPos).length;
    const rightCount = layoutStore.iconsAt(rightPos).length;
    if (mergedCount === 0 && (leftCount > 0 || rightCount > 0)) {
      isMerged.value = false;
      nextTick(() => checkCollision());
      return;
    }

    const availableWidth = getAvailableWidth();
    const estimated = estimateSplitWidth();
    if (estimated + UNMERGE_HYSTERESIS < availableWidth) {
      doUnmerge();
    }
  }
}

function captureIconRects(): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>();
  if (!rowEl.value) return map;
  const buttons = rowEl.value.querySelectorAll(".toolbar-dock-item");
  buttons.forEach((el) => {
    const id = el.getAttribute("data-icon-id");
    if (id) map.set(id, el.getBoundingClientRect());
  });
  return map;
}

function animateFrom(oldRects: Map<string, DOMRect>) {
  if (!rowEl.value || oldRects.size === 0) {
    isAnimating.value = false;
    return;
  }

  const buttons = rowEl.value.querySelectorAll<HTMLElement>(".toolbar-dock-item");
  const animations: Animation[] = [];

  buttons.forEach((el) => {
    const id = el.getAttribute("data-icon-id");
    if (!id) return;
    const oldRect = oldRects.get(id);
    if (!oldRect) return;
    const newRect = el.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    el.style.opacity = "0";
    el.style.transform = `translate(${dx}px, ${dy}px)`;

    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, opacity: "0" },
        { transform: "translate(0, 0)", opacity: "1" },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    anim.onfinish = () => {
      el.style.opacity = "";
      el.style.transform = "";
    };

    animations.push(anim);
  });

  if (animations.length > 0) {
    Promise.all(animations.map((a) => a.finished)).then(() => {
      isAnimating.value = false;
      checkCollision();
    });
  } else {
    isAnimating.value = false;
  }
}

async function doMerge() {
  isAnimating.value = true;

  const oldRects = captureIconRects();

  const allIcons = [...layoutStore.iconsAt(leftPos), ...layoutStore.iconsAt(rightPos)];
  layoutStore.setIcons(mergedPos, allIcons);
  layoutStore.clearIcons(leftPos);
  layoutStore.clearIcons(rightPos);

  isMerged.value = true;
  await nextTick();

  animateFrom(oldRects);
}

async function doUnmerge() {
  isAnimating.value = true;

  const oldRects = captureIconRects();

  const merged = layoutStore.iconsAt(mergedPos);
  const left: string[] = [];
  const right: string[] = [];
  for (const id of merged) {
    if (defaultLeftSet.has(id)) {
      left.push(id);
    } else {
      right.push(id);
    }
  }

  layoutStore.setIcons(leftPos, left);
  layoutStore.setIcons(rightPos, right);
  layoutStore.clearIcons(mergedPos);

  isMerged.value = false;
  await nextTick();

  animateFrom(oldRects);
}

function setupObserver() {
  const target = rowEl.value?.closest(".home-page-contain") as HTMLElement | null;
  if (!target) return;

  observer = new ResizeObserver(() => {
    checkCollision();
  });
  observer.observe(target);
}

onMounted(() => {
  const leftCount = layoutStore.iconsAt(leftPos).length;
  const rightCount = layoutStore.iconsAt(rightPos).length;
  const mergedCount = layoutStore.iconsAt(mergedPos).length;
  if (leftCount === 0 && rightCount === 0 && mergedCount > 0) {
    isMerged.value = true;
  }

  setupObserver();
  nextTick(checkCollision);
});

onBeforeUnmount(() => {
  observer?.disconnect();
});

watch(
  () => layoutStore.layout,
  () => {
    nextTick(checkCollision);
  },
  { deep: true }
);

watch(
  () => ui.isIconsHidden,
  () => {
    nextTick(checkCollision);
  }
);
</script>

<style scoped>
.dock-row-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dock-row-container :deep(.toolbar-dock) {
  pointer-events: auto;
}

.dock-row-container.is-animating :deep(.toolbar-dock-item) {
  transition: none !important;
}

.dock-row-container.is-animating :deep(.icon-sort-move),
.dock-row-container.is-animating :deep(.icon-sort-enter-active),
.dock-row-container.is-animating :deep(.icon-sort-leave-active) {
  transition: none !important;
}
</style>
