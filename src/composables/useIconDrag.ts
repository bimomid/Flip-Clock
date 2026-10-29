import { reactive } from "vue";
import { useIconsDragStore, type DockPosition } from "@/stores/IconsDrag";
import { useIconsLayoutStore } from "@/stores/IconsLayout";

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

const EDGE_SIZE = 50;
const MIN_SCROLL_SPEED = 2;
const MAX_SCROLL_SPEED = 12;

let moveRafId: number | null = null;
let pendingPointer: { x: number; y: number } | null = null;
let autoScrollRafId: number | null = null;
let autoScrollEl: HTMLElement | null = null;
let autoScrollSpeed = 0;
let listening = false;

function stopAutoScroll() {
  if (autoScrollRafId !== null) {
    cancelAnimationFrame(autoScrollRafId);
    autoScrollRafId = null;
  }
  autoScrollEl = null;
  autoScrollSpeed = 0;
}

function autoScrollStep() {
  if (!autoScrollEl || autoScrollSpeed === 0) {
    stopAutoScroll();
    return;
  }
  autoScrollEl.scrollLeft += autoScrollSpeed;
  autoScrollRafId = requestAnimationFrame(autoScrollStep);
}

function updateAutoScroll(el: HTMLElement | null, px: number) {
  if (!el) {
    stopAutoScroll();
    return;
  }

  const r = el.getBoundingClientRect();
  let speed = 0;

  if (px < r.left + EDGE_SIZE) {
    const dist = r.left + EDGE_SIZE - px;
    speed = -MIN_SCROLL_SPEED - (dist / EDGE_SIZE) * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED);
  } else if (px > r.right - EDGE_SIZE) {
    const dist = px - (r.right - EDGE_SIZE);
    speed = MIN_SCROLL_SPEED + (dist / EDGE_SIZE) * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED);
  }

  if (speed === 0) {
    stopAutoScroll();
    return;
  }

  autoScrollEl = el;
  autoScrollSpeed = speed;
  if (autoScrollRafId === null) autoScrollRafId = requestAnimationFrame(autoScrollStep);
}

function applyPointerMove(x: number, y: number) {
  const dragStore = useIconsDragStore();
  dragStore.globalHitTest(x, y);
  updateAutoScroll(dragStore.fluidDockEl, x);
}

function flushPointerMove() {
  moveRafId = null;
  const point = pendingPointer;
  pendingPointer = null;
  if (!point || !tracking.iconId) return;
  applyPointerMove(point.x, point.y);
}

function onPointerMove(e: PointerEvent) {
  if (!tracking.iconId) return;

  const dx = e.clientX - tracking.startX;
  const dy = e.clientY - tracking.startY;
  if (!tracking.hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

  const dragStore = useIconsDragStore();

  if (!tracking.hasMoved) {
    tracking.hasMoved = true;
    tracking.wasDragged = true;

    dragStore.iconId = tracking.iconId;
    dragStore.ghostColor = tracking.ghostColor;
    dragStore.sourceZone = tracking.sourceZone;
    dragStore.active = true;
    document.body.style.cursor = "grabbing";
  }

  pendingPointer = { x: e.clientX, y: e.clientY };
  if (moveRafId === null) moveRafId = requestAnimationFrame(flushPointerMove);
}

function flushPendingMove() {
  if (moveRafId !== null) {
    cancelAnimationFrame(moveRafId);
    moveRafId = null;
  }
  if (pendingPointer) {
    const point = pendingPointer;
    pendingPointer = null;
    if (tracking.iconId) applyPointerMove(point.x, point.y);
  }
}

function resetDragState() {
  document.body.style.cursor = "";
  if (moveRafId !== null) {
    cancelAnimationFrame(moveRafId);
    moveRafId = null;
  }
  pendingPointer = null;
  stopAutoScroll();
  useIconsDragStore().endDrag();
  tracking.iconId = null;
  tracking.sourceZone = null;
  tracking.hasMoved = false;
}

function onPointerUp() {
  flushPendingMove();

  const dragStore = useIconsDragStore();
  const layoutStore = useIconsLayoutStore();
  let didDrop = false;

  // Releasing outside every dock means "cancel", not "move to the end of the source dock".
  if (tracking.hasMoved && dragStore.sourceZone && dragStore.iconId && dragStore.targetZone) {
    const target = dragStore.targetZone;
    let insertIdx =
      dragStore.targetInsert >= 0 ? dragStore.targetInsert : layoutStore.iconsAt(target).length;

    if (dragStore.sourceZone === target) {
      const srcIdx = layoutStore.iconsAt(target).indexOf(dragStore.iconId);
      if (srcIdx !== -1 && insertIdx > srcIdx) insertIdx++;
    }

    layoutStore.moveIcon(dragStore.iconId, dragStore.sourceZone, target, insertIdx);
    didDrop = true;
  }

  if (!didDrop) tracking.wasDragged = false;

  resetDragState();
}

function onPointerCancel() {
  // A cancelled gesture (system back-swipe, incoming call, window blur) must not move
  // anything and must never leave the drag state stuck: that would freeze the dock for good.
  tracking.wasDragged = false;
  resetDragState();
}

export function useIconDrag() {
  if (listening) return;
  listening = true;
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("blur", onPointerCancel);
}
