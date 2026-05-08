<template>
  <button
    class="toolbar-dock-item"
    type="button"
    :aria-label="iconId"
    :title="iconId"
    :style="{ color: iconColor }"
    :class="{ 'is-preview': isDragPreview }"
    :data-preview="isDragPreview ? 'true' : undefined"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <span class="toolbar-dock-icon">
      <SvgIcon :config="iconConfig" />
    </span>
  </button>
</template>

<script lang="ts">
import { reactive } from "vue";
import type { DockPosition } from "@/stores/IconsDrag";

export const DRAG_THRESHOLD = 10;

export const tracking = reactive({
  iconId: null as string | null,
  startX: 0,
  startY: 0,
  hasMoved: false,
  wasDragged: false,
  dropZones: [] as DockPosition[],
  sourceZone: null as DockPosition | null,
  ghostColor: "",
});
</script>

<script setup lang="ts">
import { computed, unref } from "vue";
import { useIconsDragStore } from "@/stores/IconsDrag";
import { iconConfigMap } from "@/components/IconsConfig.vue";
import SvgIcon from "@/components/SvgIcon.vue";

const props = defineProps<{
  iconId: string;
  position: DockPosition;
  dropZones: DockPosition[];
}>();

const dragStore = useIconsDragStore();
const iconConfig = computed(() => iconConfigMap[props.iconId]);

const iconColor = computed(() => {
  const c = iconConfig.value?.color;
  return c ? unref(c) : "var(--dock-item-color)";
});

const isDragPreview = computed(() => dragStore.active && dragStore.iconId === props.iconId);

function onClick(e: MouseEvent) {
  if (tracking.wasDragged) {
    tracking.wasDragged = false;
    return;
  }
  iconConfig.value?.onClick?.(e);
}

function onPointerDown(e: PointerEvent) {
  if (dragStore.active) return;
  tracking.iconId = props.iconId;
  tracking.startX = e.clientX;
  tracking.startY = e.clientY;
  tracking.hasMoved = false;
  tracking.wasDragged = false;
  tracking.dropZones = props.dropZones;
  tracking.sourceZone = props.dropZones[0];
  tracking.ghostColor = iconColor.value;
}
</script>

<style scoped>
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
</style>
