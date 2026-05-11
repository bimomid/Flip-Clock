<template>
  <div
    v-if="store.isVisible"
    class="task-window"
    :class="{ 'is-dragging': isDragging, 'is-resizing': isResizing }"
    :style="{
      left: store.x + 'px',
      top: store.y + 'px',
      width: store.width + 'px',
      height: store.height + 'px',
    }"
  >
    <div class="task-titlebar" @pointerdown="onDragStart">
      <span class="task-titlebar-text">{{ $t("taskWindow.title") }}</span>
    </div>
    <textarea v-model="store.content" class="task-textarea" placeholder="..." spellcheck="false" />
    <div class="resize-handle resize-r" @pointerdown="onResizeStart($event, 'r')" />
    <div class="resize-handle resize-b" @pointerdown="onResizeStart($event, 'b')" />
    <div class="resize-handle resize-br" @pointerdown="onResizeStart($event, 'br')" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useTaskStore } from "@/stores/TaskWindow";

const store = useTaskStore();

const MIN_W = 220;
const MIN_H = 160;

// -- drag ------------------------------------------------------------
const isDragging = ref(false);
let dsx = 0;
let dsy = 0;
let wsx = 0;
let wsy = 0;

function onDragStart(e: PointerEvent) {
  isDragging.value = true;
  dsx = e.clientX;
  dsy = e.clientY;
  wsx = store.x;
  wsy = store.y;
  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
}

function onDragMove(e: PointerEvent) {
  const nx = wsx + (e.clientX - dsx);
  const ny = wsy + (e.clientY - dsy);
  const maxX = window.innerWidth - store.width;
  const maxY = window.innerHeight - 20;
  store.x = Math.max(0, Math.min(nx, maxX));
  store.y = Math.max(0, Math.min(ny, maxY));
}

function onDragEnd() {
  isDragging.value = false;
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
}

// -- resize ----------------------------------------------------------
type ResizeDir = "r" | "b" | "br";
const isResizing = ref(false);
let rdir: ResizeDir | null = null;
let rsx = 0;
let rsy = 0;
let rsw = 0;
let rsh = 0;

function onResizeStart(e: PointerEvent, dir: ResizeDir) {
  e.preventDefault();
  isResizing.value = true;
  rdir = dir;
  rsx = e.clientX;
  rsy = e.clientY;
  rsw = store.width;
  rsh = store.height;
  document.addEventListener("pointermove", onResizeMove);
  document.addEventListener("pointerup", onResizeEnd);
}

function onResizeMove(e: PointerEvent) {
  const dx = e.clientX - rsx;
  const dy = e.clientY - rsy;
  if (rdir === "r" || rdir === "br") {
    store.width = Math.max(MIN_W, rsw + dx);
  }
  if (rdir === "b" || rdir === "br") {
    store.height = Math.max(MIN_H, rsh + dy);
  }
}

function onResizeEnd() {
  isResizing.value = false;
  rdir = null;
  document.removeEventListener("pointermove", onResizeMove);
  document.removeEventListener("pointerup", onResizeEnd);
}

// -- clamp on mount ---------------------------------------------------
onMounted(() => {
  store.x = Math.max(0, Math.min(store.x, window.innerWidth - store.width));
  store.y = Math.max(0, Math.min(store.y, window.innerHeight - 80));
});
</script>

<style scoped>
.task-window {
  position: fixed;
  z-index: 600;
  display: flex;
  flex-direction: column;
  min-width: v-bind("MIN_W + 'px'");
  min-height: v-bind("MIN_H + 'px'");
  overflow: hidden;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 10px;
  box-shadow: 0 8px 32px hsl(0deg 0% 0% / 35%);
}

.task-titlebar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 14px;
  touch-action: none;
  cursor: move;
  user-select: none;
  background: var(--dock-item-bg);
  border-bottom: 1px solid var(--dock-border);
}

.task-titlebar-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  letter-spacing: 0.04em;
}

.task-textarea {
  flex: 1;
  width: 100%;
  padding: 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text);
  resize: none;
  outline: none;
  background: transparent;
  border: none;
}

.task-textarea::placeholder {
  color: var(--dock-item-color);
  opacity: 0.5;
}

.task-textarea::-webkit-scrollbar {
  width: 6px;
}

.task-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.task-textarea::-webkit-scrollbar-thumb {
  background: var(--dock-border);
  border-radius: 3px;
}

.is-dragging .task-textarea,
.is-resizing .task-textarea {
  pointer-events: none;
}

.is-dragging,
.is-resizing {
  user-select: none;
}

/* resize handles */
.resize-handle {
  position: absolute;
  z-index: 10;
  touch-action: none;
}

.resize-r {
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
}

.resize-b {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize;
}

.resize-br {
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
</style>
