import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";

export type DockPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const POSITIONS: DockPosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

const STORAGE_KEY = "flip-clock-dock-v2";

const DEFAULT_LAYOUT: Record<DockPosition, string[]> = {
  "top-left": [],
  "top-right": ["theme", "palette", "time-format"],
  "bottom-left": ["settings"],
  "bottom-right": ["loading"],
};

function readStorage(): Record<DockPosition, string[]> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useDockStore = defineStore("dock", () => {
  const layout = ref<Record<DockPosition, string[]>>(structuredClone(DEFAULT_LAYOUT));

  let initialized = false;

  function initLayout() {
    const stored = readStorage();
    if (stored) {
      layout.value = stored;
    }
    initialized = true;
  }

  watch(
    layout,
    (val) => {
      if (initialized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      }
    },
    { deep: true }
  );

  function iconsAt(pos: DockPosition): string[] {
    return layout.value[pos];
  }

  function moveIcon(iconId: string, from: DockPosition, to: DockPosition, toIndex?: number) {
    if (from === to) {
      reorder(from, iconId, toIndex);
      return;
    }

    const fromList = layout.value[from];
    const toList = layout.value[to];
    const idx = fromList.indexOf(iconId);
    if (idx === -1) return;

    fromList.splice(idx, 1);
    const insertAt = toIndex !== undefined ? toIndex : toList.length;
    toList.splice(insertAt, 0, iconId);

    layout.value = { ...layout.value };
  }

  function reorder(position: DockPosition, iconId: string, toIndex?: number) {
    const list = layout.value[position];
    const fromIdx = list.indexOf(iconId);
    if (fromIdx === -1) return;
    if (toIndex === undefined || toIndex === fromIdx) return;

    list.splice(fromIdx, 1);
    const insertAt = toIndex > fromIdx ? toIndex - 1 : toIndex;
    list.splice(insertAt, 0, iconId);
    layout.value = { ...layout.value };
  }

  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    layout.value = structuredClone(DEFAULT_LAYOUT);
  }

  const activePositions = computed(() => POSITIONS.filter((p) => layout.value[p].length > 0));

  return {
    layout,
    initLayout,
    iconsAt,
    moveIcon,
    reorder,
    resetLayout,
    activePositions,
  };
});
