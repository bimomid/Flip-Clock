import { ref } from "vue";
import { defineStore } from "pinia";
import type { DockPosition } from "./IconsDrag";
import { defaultLayout } from "@/components/IconsConfig.vue";

export const useIconsLayoutStore = defineStore(
  "iconsLayout",
  () => {
    const layout = ref<Record<DockPosition, string[]>>(structuredClone(defaultLayout));

    function iconsAt(pos: DockPosition): string[] {
      return layout.value[pos];
    }

    function moveIcon(iconId: string, from: DockPosition, to: DockPosition, insertAt?: number) {
      const fromList = layout.value[from];
      const idx = fromList.indexOf(iconId);
      if (idx === -1) return;

      fromList.splice(idx, 1);

      if (from === to && insertAt !== undefined && insertAt > idx) {
        insertAt--;
      }

      layout.value[to].splice(insertAt ?? layout.value[to].length, 0, iconId);
      layout.value = { ...layout.value };
    }

    function setIcons(pos: DockPosition, icons: string[]) {
      layout.value[pos] = [...icons];
      layout.value = { ...layout.value };
    }

    function clearIcons(pos: DockPosition) {
      if (layout.value[pos].length === 0) return;
      layout.value[pos] = [];
      layout.value = { ...layout.value };
    }

    function resetLayout() {
      layout.value = structuredClone(defaultLayout);
    }

    return { layout, iconsAt, moveIcon, setIcons, clearIcons, resetLayout };
  },
  {
    persist: {
      key: "flip-clock-dock-v2",
      pick: ["layout"],
      serializer: {
        deserialize(value: string) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object" && "layout" in parsed) {
              return parsed;
            }
            return { layout: parsed };
          } catch {
            return { layout: undefined };
          }
        },
        serialize: JSON.stringify,
      },
    },
  }
);
