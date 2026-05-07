<script lang="ts">
import { reactive } from "vue";
import type { DockPosition } from "@/stores/dock";

interface DockRef {
  el: HTMLElement;
  dropZones: DockPosition[];
  getInsertIndex(cx: number): number;
  getRealCount(): number;
}

const dockRefs = new Map<string, DockRef>();

export function registerDock(id: string, ref: DockRef) {
  dockRefs.set(id, ref);
}
export function unregisterDock(id: string) {
  dockRefs.delete(id);
}

export const drag = reactive({
  iconId: null as string | null,
  svg: "",
  sourceZone: null as DockPosition | null,
  x: 0,
  y: 0,
  active: false,
  targetZone: null as DockPosition | null,
  targetInsert: -1,
});

export function endDrag() {
  drag.iconId = null;
  drag.svg = "";
  drag.sourceZone = null;
  drag.active = false;
  drag.targetZone = null;
  drag.targetInsert = -1;
}

const HIT_PAD_X = 20;
const HIT_PAD_Y = 12;

function globalHitTest(cx: number, cy: number) {
  drag.x = cx;
  drag.y = cy;
  for (const [, dock] of dockRefs) {
    const r = dock.el.getBoundingClientRect();
    if (
      cx >= r.left - HIT_PAD_X &&
      cx <= r.right + HIT_PAD_X &&
      cy >= r.top - HIT_PAD_Y &&
      cy <= r.bottom + HIT_PAD_Y
    ) {
      drag.targetZone = dock.dropZones[0];
      drag.targetInsert = dock.getInsertIndex(cx);
      return;
    }
  }
  drag.targetZone = null;
  drag.targetInsert = -1;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useDockStore } from "@/stores/dock";
import { useIconRegistry, type IconConfig } from "@/composables/useIconRegistry";

interface DisplayIcon extends IconConfig {
  _preview?: boolean;
}

const props = defineProps<{
  position: DockPosition;
  dropZones: DockPosition[];
}>();

const dockStore = useDockStore();
const { resolve } = useIconRegistry();

const resolvedIcons = computed<IconConfig[]>(() =>
  props.dropZones.flatMap(
    (zone) =>
      dockStore
        .iconsAt(zone)
        .map((id) => resolve(id))
        .filter(Boolean) as IconConfig[]
  )
);

const isDragTarget = computed(
  () => drag.active && drag.targetZone !== null && props.dropZones.includes(drag.targetZone)
);

const localInsertIdx = computed(() => (isDragTarget.value ? drag.targetInsert : -1));

const displayIcons = computed<DisplayIcon[]>(() => {
  const icons: DisplayIcon[] = resolvedIcons.value.filter((icon) => icon.id !== drag.iconId);
  if (!isDragTarget.value || !drag.iconId) return icons;

  const preview = resolve(drag.iconId);
  if (!preview) return icons;

  const idx = Math.min(localInsertIdx.value, icons.length);
  return [...icons.slice(0, idx), { ...preview, _preview: true }, ...icons.slice(idx)];
});

const isEmpty = computed(() => displayIcons.value.length === 0);
const isHidden = computed(() => isEmpty.value && !drag.active);

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

function getRealCount(): number {
  return displayIcons.value.filter((i) => !i._preview).length;
}

const dockEl = ref<HTMLElement | null>(null);
const pointerStartX = ref(0);
const pointerStartY = ref(0);
const pointerOnIcon = ref<string | null>(null);
const hasMoved = ref(false);
const suppressClick = ref(false);
const DRAG_THRESHOLD = 10;

function onIconClick(icon: DisplayIcon, e: MouseEvent) {
  if (suppressClick.value) {
    suppressClick.value = false;
    return;
  }
  resolve(icon.id)?.onClick?.(e);
}

function onPointerDown(e: PointerEvent, iconId: string, _zone: DockPosition) {
  if (drag.active) return;
  suppressClick.value = false;
  pointerStartX.value = e.clientX;
  pointerStartY.value = e.clientY;
  pointerOnIcon.value = iconId;
  hasMoved.value = false;
  document.addEventListener("pointermove", onDocPointerMove);
  document.addEventListener("pointerup", onDocPointerUp);
}

function onDocPointerMove(e: PointerEvent) {
  if (!pointerOnIcon.value) return;
  const dx = e.clientX - pointerStartX.value;
  const dy = e.clientY - pointerStartY.value;
  if (!hasMoved.value && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

  if (!hasMoved.value) {
    hasMoved.value = true;
    suppressClick.value = true;
    const iconConfig = resolve(pointerOnIcon.value);
    if (!iconConfig) return;

    drag.iconId = pointerOnIcon.value;
    drag.svg = iconConfig.svg;
    drag.sourceZone = props.dropZones[0];
    drag.active = true;
    document.body.style.cursor = "grabbing";
  }

  globalHitTest(e.clientX, e.clientY);
}

function onDocPointerUp(_e: PointerEvent) {
  document.removeEventListener("pointermove", onDocPointerMove);
  document.removeEventListener("pointerup", onDocPointerUp);
  document.body.style.cursor = "";

  if (!pointerOnIcon.value) return;

  if (hasMoved.value) {
    performDrop();
  }

  pointerOnIcon.value = null;
  hasMoved.value = false;
  endDrag();
}

function performDrop() {
  if (!drag.sourceZone || !drag.iconId) return;
  const target = drag.targetZone ?? props.dropZones[0];
  let insertIdx = drag.targetInsert >= 0 ? drag.targetInsert : dockStore.iconsAt(target).length;

  if (drag.sourceZone === target) {
    const srcIdx = dockStore.iconsAt(target).indexOf(drag.iconId);
    if (srcIdx !== -1 && insertIdx > srcIdx) insertIdx++;
  }

  dockStore.moveIcon(drag.iconId, drag.sourceZone, target, insertIdx);
}

onMounted(() => {
  if (dockEl.value) {
    registerDock(props.position, {
      el: dockEl.value,
      dropZones: props.dropZones,
      getInsertIndex,
      getRealCount,
    });
  }
});

onBeforeUnmount(() => {
  unregisterDock(props.position);
  document.removeEventListener("pointermove", onDocPointerMove);
  document.removeEventListener("pointerup", onDocPointerUp);
});
</script>

<template>
  <div
    ref="dockEl"
    class="toolbar-dock"
    :data-position="position"
    :class="{
      'is-hidden': isHidden,
      'is-drop-target': isEmpty && drag.active,
      'is-drag-target': isDragTarget && !isEmpty,
    }"
  >
    <TransitionGroup name="icon-sort" tag="div" class="toolbar-dock-row">
      <button
        v-for="icon in displayIcons"
        :key="icon._preview ? '__preview__' : icon.id"
        class="toolbar-dock-item"
        type="button"
        :aria-label="icon.id"
        :title="icon.id"
        :style="icon.color ? { color: icon.color } : undefined"
        :class="{ 'is-preview': icon._preview }"
        :data-preview="icon._preview ? 'true' : undefined"
        @pointerdown="icon._preview ? undefined : onPointerDown($event, icon.id, dropZones[0])"
        @click="icon._preview ? undefined : onIconClick(icon, $event)"
      >
        <span class="toolbar-dock-icon" v-html="icon.svg"></span>
      </button>
    </TransitionGroup>
  </div>
</template>

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

.toolbar-dock.is-drop-target {
  padding: 10px 14px;
  border: 2px dashed var(--dock-border);
  border-radius: var(--dock-radius);
  opacity: 0.5;
  transition: opacity 0.15s ease;
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

.toolbar-dock-item {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--icon-size);
  height: var(--icon-size);
  padding: 0;
  color: var(--dock-item-color);
  touch-action: none;
  cursor: grab;
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
  border-radius: 999px;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.toolbar-dock-item:hover:not(.is-preview) {
  color: var(--dock-item-color-hover);
  border-color: var(--dock-item-border-hover);
  transform: translateY(-1px);
}

.toolbar-dock-item.is-preview {
  pointer-events: none;
  cursor: inherit;
  border-color: var(--dock-item-border-hover);
  box-shadow: 0 2px 12px hsl(0deg 0% 0% / 12%);
  opacity: 0.6;
}

.toolbar-dock-icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  pointer-events: none;
}

.toolbar-dock-icon :deep(svg) {
  display: block;
  width: 18px;
  height: 18px;
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
</style>
