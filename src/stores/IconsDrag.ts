import { ref } from "vue";
import { defineStore } from "pinia";

export type DockPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DockRef {
  el: HTMLElement;
  dropZones: DockPosition[];
  getInsertIndex(cx: number): number;
}

const HIT_PAD_X = 20;
const HIT_PAD_Y = 12;

export const useIconsDragStore = defineStore("iconsDrag", () => {
  const dockRefs = new Map<string, DockRef>();

  const iconId = ref<string | null>(null);
  const ghostColor = ref("");
  const sourceZone = ref<DockPosition | null>(null);
  const x = ref(0);
  const y = ref(0);
  const active = ref(false);
  const targetZone = ref<DockPosition | null>(null);
  const targetInsert = ref(-1);

  function registerDock(id: string, ref: DockRef) {
    dockRefs.set(id, ref);
  }

  function unregisterDock(id: string) {
    dockRefs.delete(id);
  }

  function endDrag() {
    iconId.value = null;
    ghostColor.value = "";
    sourceZone.value = null;
    active.value = false;
    targetZone.value = null;
    targetInsert.value = -1;
  }

  function globalHitTest(cx: number, cy: number) {
    x.value = cx;
    y.value = cy;
    for (const [, dock] of dockRefs) {
      const r = dock.el.getBoundingClientRect();
      if (
        cx >= r.left - HIT_PAD_X &&
        cx <= r.right + HIT_PAD_X &&
        cy >= r.top - HIT_PAD_Y &&
        cy <= r.bottom + HIT_PAD_Y
      ) {
        targetZone.value = dock.dropZones[0];
        targetInsert.value = dock.getInsertIndex(cx);
        return;
      }
    }
    targetZone.value = null;
    targetInsert.value = -1;
  }

  return {
    iconId,
    ghostColor,
    sourceZone,
    x,
    y,
    active,
    targetZone,
    targetInsert,
    registerDock,
    unregisterDock,
    endDrag,
    globalHitTest,
  };
});
