<template>
  <div
    ref="dockEl"
    class="toolbar-dock"
    :data-position="position"
    :class="{
      'is-hidden': isHidden,
      'is-fluid': fluid,
      'is-drop-target': isEmpty && dragStore.active,
      'is-drag-target': isDragTarget && !isEmpty,
      'show-scrollbar': scrollbarVisible,
    }"
  >
    <TransitionGroup name="icon-sort" tag="div" class="toolbar-dock-row">
      <IconsDrag
        v-for="icon in displayIcons"
        :key="icon._preview ? '__preview__' : icon.id"
        :icon-id="icon.id"
        :position="position"
        :drop-zones="dropZones"
      />
    </TransitionGroup>
  </div>

  <div
    v-if="dragStore.active && dragStore.sourceZone === position"
    class="drag-ghost"
    :style="{ left: dragStore.x + 'px', top: dragStore.y + 'px', color: dragStore.ghostColor }"
  >
    <SvgIcon :config="iconConfigMap[dragStore.iconId!]" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useIconsDragStore, type DockPosition } from "@/stores/IconsDrag";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { iconConfigMap } from "@/components/IconsConfig.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import IconsDrag, { tracking, DRAG_THRESHOLD } from "@/components/IconsDrag.vue";

const props = defineProps<{
  position: DockPosition;
  dropZones: DockPosition[];
  fluid?: boolean;
  mergedIcons?: string[];
}>();

const dragStore = useIconsDragStore();
const layoutStore = useIconsLayoutStore();

const dockEl = ref<HTMLElement | null>(null);

interface DisplayIcon {
  id: string;
  _preview?: boolean;
}

const isDragTarget = computed(
  () =>
    dragStore.active &&
    dragStore.targetZone !== null &&
    props.dropZones.includes(dragStore.targetZone)
);

const displayIcons = computed<DisplayIcon[]>(() => {
  const sourceList = props.mergedIcons ?? layoutStore.iconsAt(props.position);
  const icons: DisplayIcon[] = sourceList
    .filter((id) => id !== dragStore.iconId)
    .map((id) => ({ id }));

  if (!isDragTarget.value || !dragStore.iconId) return icons;

  const localIdx = dragStore.targetInsert >= 0 ? dragStore.targetInsert : icons.length;
  const idx = Math.min(localIdx, icons.length);

  return [...icons.slice(0, idx), { id: dragStore.iconId, _preview: true }, ...icons.slice(idx)];
});

const isEmpty = computed(() => displayIcons.value.length === 0);
const isHidden = computed(() => isEmpty.value && !dragStore.active);

function getInsertIndex(cx: number): number {
  const row = dockEl.value?.querySelector(".toolbar-dock-row") as HTMLElement | null;
  if (!row) return displayIcons.value.length;

  const items = Array.from(row.children) as HTMLElement[];
  let realIdx = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].dataset.preview === "true") continue;
    const r = items[i].getBoundingClientRect();
    if (cx < r.left + r.width / 2) return realIdx;
    realIdx++;
  }
  return realIdx;
}

// ---- 拖拽：文档级 pointermove / pointerup ----

function onDocPointerMove(e: PointerEvent) {
  if (!tracking.iconId) return;
  const dx = e.clientX - tracking.startX;
  const dy = e.clientY - tracking.startY;
  if (!tracking.hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

  if (!tracking.hasMoved) {
    tracking.hasMoved = true;
    tracking.wasDragged = true;

    dragStore.iconId = tracking.iconId;
    dragStore.ghostColor = tracking.ghostColor;
    dragStore.sourceZone = tracking.sourceZone;
    dragStore.active = true;
    document.body.style.cursor = "grabbing";
  }

  dragStore.globalHitTest(e.clientX, e.clientY);

  // 合并模式下，拖拽图标靠近边界时自动滚动
  if (props.fluid && dockEl.value) {
    autoScrollNearEdge(e.clientX);
  }
}

// ---- 边缘自动滚动 ----

let autoScrollRafId: number | null = null;

function autoScrollNearEdge(px: number) {
  if (!dockEl.value) return;
  const r = dockEl.value.getBoundingClientRect();
  const edgeSize = 50; // 触发区域宽度
  const minSpeed = 2;
  const maxSpeed = 12;

  let speed = 0;

  if (px < r.left + edgeSize) {
    // 靠近左边界
    const dist = r.left + edgeSize - px;
    speed = -minSpeed - (dist / edgeSize) * (maxSpeed - minSpeed);
  } else if (px > r.right - edgeSize) {
    // 靠近右边界
    const dist = px - (r.right - edgeSize);
    speed = minSpeed + (dist / edgeSize) * (maxSpeed - minSpeed);
  }

  if (speed !== 0) {
    if (!autoScrollRafId) {
      const el = dockEl.value;
      function step() {
        el.scrollLeft += speed;
        autoScrollRafId = requestAnimationFrame(step);
      }
      autoScrollRafId = requestAnimationFrame(step);
    }
  } else {
    stopAutoScroll();
  }
}

function stopAutoScroll() {
  if (autoScrollRafId) {
    cancelAnimationFrame(autoScrollRafId);
    autoScrollRafId = null;
  }
}

function onDocPointerUp() {
  document.body.style.cursor = "";

  let didDrop = false;

  if (tracking.hasMoved && dragStore.sourceZone && dragStore.iconId) {
    const target = dragStore.targetZone ?? tracking.dropZones[0];
    let insertIdx =
      dragStore.targetInsert >= 0 ? dragStore.targetInsert : layoutStore.iconsAt(target).length;

    if (dragStore.sourceZone === target) {
      const srcIdx = layoutStore.iconsAt(target).indexOf(dragStore.iconId);
      if (srcIdx !== -1 && insertIdx > srcIdx) insertIdx++;
    }

    layoutStore.moveIcon(dragStore.iconId, dragStore.sourceZone, target, insertIdx);
    didDrop = true;
  }

  // 移动端手指轻触时的微小抖动可能超过 DRAG_THRESHOLD 导致 hasMoved 被置为 true，
  // 但如果没有实际完成拖拽（didDrop = false），应将 wasDragged 重置，避免误吞后续的 click 事件。
  if (!didDrop) {
    tracking.wasDragged = false;
  }

  dragStore.endDrag();
  stopAutoScroll();
  tracking.iconId = null;
  tracking.sourceZone = null;
  tracking.hasMoved = false;
}

// ---- 滚动条显隐控制（JS 管理，避免 CSS :hover 不可靠） ----

const scrollbarVisible = ref(false);
let scrollbarHideTimer: ReturnType<typeof setTimeout> | null = null;
const SCROLLBAR_HIDE_DELAY = 600;

function showScrollbar() {
  if (!props.fluid) return;
  if (scrollbarHideTimer) {
    clearTimeout(scrollbarHideTimer);
    scrollbarHideTimer = null;
  }
  scrollbarVisible.value = true;
}

function hideScrollbar() {
  if (!props.fluid) return;
  scrollbarHideTimer = setTimeout(() => {
    scrollbarVisible.value = false;
  }, SCROLLBAR_HIDE_DELAY);
}

function cancelScrollbarTimer() {
  if (scrollbarHideTimer) {
    clearTimeout(scrollbarHideTimer);
    scrollbarHideTimer = null;
  }
}

onMounted(() => {
  if (dockEl.value) {
    dragStore.registerDock(props.position, {
      el: dockEl.value,
      dropZones: props.dropZones,
      getInsertIndex,
    });

    if (props.fluid) {
      dockEl.value.addEventListener("mouseenter", showScrollbar);
      dockEl.value.addEventListener("mouseleave", hideScrollbar);
      dockEl.value.addEventListener("scroll", showScrollbar);
    }
  }
  document.addEventListener("pointermove", onDocPointerMove);
  document.addEventListener("pointerup", onDocPointerUp);
});

onBeforeUnmount(() => {
  dragStore.unregisterDock(props.position);
  stopAutoScroll();
  cancelScrollbarTimer();
  if (dockEl.value && props.fluid) {
    dockEl.value.removeEventListener("mouseenter", showScrollbar);
    dockEl.value.removeEventListener("mouseleave", hideScrollbar);
    dockEl.value.removeEventListener("scroll", showScrollbar);
  }
  document.removeEventListener("pointermove", onDocPointerMove);
  document.removeEventListener("pointerup", onDocPointerUp);
});
</script>

<style scoped>
.toolbar-dock {
  --dock-padding: 10px 14px;
  --dock-radius: 999px;
  --dock-gap: 12px;
  --icon-size: 38px;

  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.toolbar-dock.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.toolbar-dock[data-position="top-left"] {
  top: 35px;
  left: 20px;
}

.toolbar-dock[data-position="top-right"] {
  top: 35px;
  right: 20px;
}

.toolbar-dock[data-position="bottom-left"] {
  bottom: 35px;
  left: 20px;
}

.toolbar-dock[data-position="bottom-right"] {
  right: 20px;
  bottom: 35px;
}

.toolbar-dock[data-position="top"] {
  top: 35px;
  right: 20px;
  left: 20px;
}

.toolbar-dock[data-position="bottom"] {
  right: 20px;
  bottom: 35px;
  left: 20px;
}

.toolbar-dock-row {
  display: inline-flex;
  gap: var(--dock-gap);
  align-items: center;
  padding: var(--dock-padding);
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: var(--dock-radius);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.toolbar-dock.is-drag-target .toolbar-dock-row {
  border-color: var(--dock-item-border-hover) !important;
  box-shadow: 0 0 0 1.5px hsl(var(--s-h) var(--s-s) var(--s-l) / 25%);
}

/* fluid: 合并后的全宽图标栏 */
.toolbar-dock.is-fluid {
  align-items: flex-start;
  padding: 10px 14px;
  overflow: auto visible;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: var(--dock-radius);
}

.toolbar-dock.is-fluid .toolbar-dock-row {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: var(--dock-gap);
  align-items: center;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

/* fluid 模式下拖拽高亮应用到外壳上 */
.toolbar-dock.is-fluid.is-drag-target {
  border-color: var(--dock-item-border-hover) !important;
  box-shadow: 0 0 0 1.5px hsl(var(--s-h) var(--s-s) var(--s-l) / 25%);
}

.toolbar-dock.is-fluid.is-drag-target .toolbar-dock-row {
  border-color: transparent !important;
  box-shadow: none;
}

.toolbar-dock.is-drop-target {
  padding: 10px 14px;
  border: 2px dashed var(--dock-border);
  border-radius: var(--dock-radius);
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.icon-sort-move {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.icon-sort-enter-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.icon-sort-leave-active {
  position: absolute;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.icon-sort-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.icon-sort-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* 拖拽虚影 */
.drag-ghost {
  position: fixed;
  z-index: 9999;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  pointer-events: none;
  background: var(--dock-item-bg);
  border: 1.5px solid var(--dock-item-border-hover);
  border-radius: 50%;
  box-shadow: 0 4px 20px hsl(0deg 0% 0% / 18%);
  opacity: 0.92;
  transform: translate(-50%, -50%);
}

.drag-ghost :deep(svg) {
  display: block;
  width: 18px;
  height: 18px;
}
</style>

<style>
/* ====== 合并图标栏原生滚动条样式（Chrome/Edge/Safari） ====== */

.toolbar-dock.is-fluid::-webkit-scrollbar {
  height: 3px;
}

.toolbar-dock.is-fluid::-webkit-scrollbar-track {
  margin: 0 14px;
  background: transparent;
}

.toolbar-dock.is-fluid::-webkit-scrollbar-thumb {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 0%);
  border-radius: 999px;
  transition: background 0.2s ease;
}

.toolbar-dock.is-fluid.show-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 35%);
}

.toolbar-dock.is-fluid::-webkit-scrollbar-button {
  display: none;
}

.toolbar-dock.is-fluid::-webkit-scrollbar-corner {
  background: transparent;
}

/* 悬停滑块本体时加深 */
.toolbar-dock.is-fluid::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 55%);
}

/* 拖拽滑块时最深 */
.toolbar-dock.is-fluid::-webkit-scrollbar-thumb:active {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 70%);
}

/* ====== Firefox 滚动条 ====== */

@supports (-moz-appearance: none) {
  .toolbar-dock.is-fluid {
    scrollbar-color: hsl(var(--s-h) var(--s-s) var(--s-l) / 35%) transparent;
    scrollbar-width: thin;
  }
}
</style>
