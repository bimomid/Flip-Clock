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
import { defaultLayout as defaultLayoutMap, isIconsHidden } from "@/components/IconsConfig.vue";
import IconsDock from "@/components/IconsDock.vue";

const props = defineProps<{
  row: "top" | "bottom";
}>();

const layoutStore = useIconsLayoutStore();

const rowEl = ref<HTMLElement | null>(null);
const isMerged = ref(false);
const isAnimating = ref(false);

const leftPos: DockPosition = props.row === "top" ? "top-left" : "bottom-left";
const rightPos: DockPosition = props.row === "top" ? "top-right" : "bottom-right";
const mergedPos: DockPosition = props.row === "top" ? "top" : "bottom";

const defaultLeftSet = new Set(defaultLayoutMap[leftPos]);

const combinedIcons = computed(() => layoutStore.iconsAt(mergedPos));

let observer: ResizeObserver | null = null;

// ---- 碰撞检测 ----

const COLLISION_THRESHOLD = 24;
const UNMERGE_HYSTERESIS = 60; // 分离需要更大的余量，避免抖动

function getAvailableWidth(): number {
  const container = rowEl.value?.closest(".home-page-contain") as HTMLElement;
  if (!container) return Infinity;
  return container.clientWidth - 40; // 20px left + 20px right
}

function calcPillWidth(count: number): number {
  if (count === 0) return 0;
  const ICON_SIZE = 38;
  const ICON_GAP = 12;
  const PILL_PAD = 14;
  return PILL_PAD * 2 + 2 + count * ICON_SIZE + (count - 1) * ICON_GAP;
}

/** 仅在分离模式下调用：测量左右两个 pill 的宽度计算间隙 */
function measureSplitGap(): number {
  if (!rowEl.value) return Infinity;

  const leftCount = layoutStore.iconsAt(leftPos).length;
  const rightCount = layoutStore.iconsAt(rightPos).length;
  if (leftCount === 0 && rightCount === 0) return Infinity;

  const pillW = (pos: DockPosition, count: number) => {
    if (isIconsHidden.value) return calcPillWidth(count);
    const row = rowEl.value!.querySelector(
      `[data-position="${pos}"] .toolbar-dock-row`
    ) as HTMLElement | null;
    return row?.scrollWidth ?? 0;
  };

  return getAvailableWidth() - pillW(leftPos, leftCount) - pillW(rightPos, rightCount);
}

/** 在合并模式下估算拆分成两个 pill 后的总宽度 */
function estimateSplitWidth(): number {
  const merged = layoutStore.iconsAt(mergedPos);
  const leftIcons = merged.filter((id) => defaultLeftSet.has(id));
  const rightIcons = merged.filter((id) => !defaultLeftSet.has(id));

  return calcPillWidth(leftIcons.length) + calcPillWidth(rightIcons.length);
}

function checkCollision() {
  if (isAnimating.value) return;

  if (!isMerged.value) {
    // 分离模式：检测左右 pill 是否即将碰撞
    const gap = measureSplitGap();
    if (gap < COLLISION_THRESHOLD) {
      doMerge();
    }
  } else {
    // 处理外部重置（如 resetLayout）：合并位置为空但角落有图标 → 切回分离并重新检测
    const mergedCount = layoutStore.iconsAt(mergedPos).length;
    const leftCount = layoutStore.iconsAt(leftPos).length;
    const rightCount = layoutStore.iconsAt(rightPos).length;
    if (mergedCount === 0 && (leftCount > 0 || rightCount > 0)) {
      isMerged.value = false;
      nextTick(() => checkCollision());
      return;
    }

    // 合并模式：估算分离后是否能放下（加滞后余量防抖）
    const availableWidth = getAvailableWidth();
    const estimated = estimateSplitWidth();
    if (estimated + UNMERGE_HYSTERESIS < availableWidth) {
      doUnmerge();
    }
  }
}

// ---- 捕获图标位置 ----

function captureIconRects(): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>();
  if (!rowEl.value) return map;
  const buttons = rowEl.value.querySelectorAll(".toolbar-dock-item");
  buttons.forEach((el) => {
    const id = el.getAttribute("aria-label");
    if (id) map.set(id, el.getBoundingClientRect());
  });
  return map;
}

// ---- FLIP 动画 ----

function animateFrom(oldRects: Map<string, DOMRect>) {
  if (!rowEl.value || oldRects.size === 0) {
    isAnimating.value = false;
    return;
  }

  const buttons = rowEl.value.querySelectorAll<HTMLElement>(".toolbar-dock-item");
  const animations: Animation[] = [];

  buttons.forEach((el) => {
    const id = el.getAttribute("aria-label");
    if (!id) return;
    const oldRect = oldRects.get(id);
    if (!oldRect) return;
    const newRect = el.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    // 先设置初始状态，防止闪烁一帧
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

// ---- 合并 / 分离 ----

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

// ---- ResizeObserver ----

function setupObserver() {
  const target = rowEl.value?.closest(".home-page-contain") as HTMLElement | null;
  if (!target) return;

  observer = new ResizeObserver(() => {
    checkCollision();
  });
  observer.observe(target);
}

onMounted(() => {
  // 处理持久化状态：如果合并位置有图标但角落位置为空，直接以合并模式启动
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

// 监听布局变化（如重置按钮），自动修正合并/分离状态
watch(
  () => layoutStore.layout,
  () => {
    nextTick(checkCollision);
  },
  { deep: true }
);

// 图标隐藏/显示时重新检测碰撞（DOM 中图标数量变化会导致测量不准）
watch(isIconsHidden, () => {
  nextTick(checkCollision);
});
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

/* 动画期间禁用所有 CSS transition，避免和 FLIP 冲突 */
.dock-row-container.is-animating :deep(.toolbar-dock-item) {
  transition: none !important;
}

.dock-row-container.is-animating :deep(.icon-sort-move),
.dock-row-container.is-animating :deep(.icon-sort-enter-active),
.dock-row-container.is-animating :deep(.icon-sort-leave-active) {
  transition: none !important;
}
</style>
