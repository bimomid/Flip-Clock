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
import { iconConfigMap } from "@/config/icons";
import { useIconsUIStore } from "@/stores/IconsUI";
import SvgIcon from "@/components/SvgIcon.vue";
import IconsDrag from "@/components/IconsDrag.vue";

const props = defineProps<{
  position: DockPosition;
  dropZones: DockPosition[];
  fluid?: boolean;
  mergedIcons?: string[];
}>();

const dragStore = useIconsDragStore();
const ui = useIconsUIStore();
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
  let icons: DisplayIcon[] = sourceList
    .filter((id) => id !== dragStore.iconId)
    .map((id) => ({ id }));

  if (ui.isIconsHidden) {
    icons = icons.filter((icon) => icon.id === "visibility");
  }

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
      dragStore.setFluidDock(dockEl.value);
      dockEl.value.addEventListener("mouseenter", showScrollbar);
      dockEl.value.addEventListener("mouseleave", hideScrollbar);
      dockEl.value.addEventListener("scroll", showScrollbar);
    }
  }
});

onBeforeUnmount(() => {
  dragStore.unregisterDock(props.position);
  cancelScrollbarTimer();
  if (dockEl.value && props.fluid) {
    if (dragStore.fluidDockEl === dockEl.value) dragStore.setFluidDock(null);
    dockEl.value.removeEventListener("mouseenter", showScrollbar);
    dockEl.value.removeEventListener("mouseleave", hideScrollbar);
    dockEl.value.removeEventListener("scroll", showScrollbar);
  }
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
  top: calc(var(--dock-margin) + var(--safe-top));
  left: calc(var(--dock-side) + var(--safe-left));
}

.toolbar-dock[data-position="top-right"] {
  top: calc(var(--dock-margin) + var(--safe-top));
  right: calc(var(--dock-side) + var(--safe-right));
}

.toolbar-dock[data-position="bottom-left"] {
  bottom: calc(var(--dock-margin) + var(--safe-bottom));
  left: calc(var(--dock-side) + var(--safe-left));
}

.toolbar-dock[data-position="bottom-right"] {
  right: calc(var(--dock-side) + var(--safe-right));
  bottom: calc(var(--dock-margin) + var(--safe-bottom));
}

.toolbar-dock[data-position="top"] {
  top: calc(var(--dock-margin) + var(--safe-top));
  right: calc(var(--dock-side) + var(--safe-right));
  left: calc(var(--dock-side) + var(--safe-left));
}

.toolbar-dock[data-position="bottom"] {
  right: calc(var(--dock-side) + var(--safe-right));
  bottom: calc(var(--dock-margin) + var(--safe-bottom));
  left: calc(var(--dock-side) + var(--safe-left));
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

.toolbar-dock.is-fluid::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 55%);
}

.toolbar-dock.is-fluid::-webkit-scrollbar-thumb:active {
  background: hsl(var(--s-h) var(--s-s) var(--s-l) / 70%);
}

@supports (-moz-appearance: none) {
  .toolbar-dock.is-fluid {
    scrollbar-color: hsl(var(--s-h) var(--s-s) var(--s-l) / 35%) transparent;
    scrollbar-width: thin;
  }
}
</style>
