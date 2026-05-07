import { ref } from "vue";
import { useThemeStore } from "@/stores/theme";
import { useClockStore } from "@/stores/clock";
import { useDockStore } from "@/stores/dock";
import settingsSvg from "@/assets/Func-Settings.svg?raw";
import darkSvg from "@/assets/Model-Dark.svg?raw";
import lightSvg from "@/assets/Model-Light.svg?raw";
import paletteSvg from "@/assets/Model-Palette.svg?raw";
import time12Svg from "@/assets/Model-12.svg?raw";
import time24Svg from "@/assets/Model-24.svg?raw";
import loadingSvg from "@/assets/Model-Loading.svg?raw";

export interface IconConfig {
  id: string;
  svg: string;
  color: string;
  onClick?: (event: MouseEvent) => void;
}

const showPalette = ref(false);

export function useIconRegistry() {
  const themeStore = useThemeStore();
  const clockStore = useClockStore();
  const dockStore = useDockStore();

  const registry: Record<string, () => IconConfig> = {
    theme: () => {
      const isDark = themeStore.isDark;
      return {
        id: "theme",
        svg: isDark ? darkSvg : lightSvg,
        color: isDark ? "var(--theme-icon-dark)" : "var(--theme-icon-light)",
        onClick: (e: MouseEvent) => {
          themeStore.toggleThemeWithTransition({
            x: e.clientX,
            y: e.clientY,
          });
        },
      };
    },
    palette: () => ({
      id: "palette",
      svg: paletteSvg,
      color: "var(--theme-icon-palette)",
      onClick: () => {
        showPalette.value = !showPalette.value;
      },
    }),
    "time-format": () => ({
      id: "time-format",
      svg: clockStore.is24h ? time24Svg : time12Svg,
      color: clockStore.is24h ? "var(--theme-icon-time-24)" : "var(--theme-icon-time-12)",
      onClick: () => {
        clockStore.toggle();
      },
    }),
    settings: () => ({
      id: "settings",
      svg: settingsSvg,
      color: "var(--theme-icon-settings)",
    }),
    loading: () => ({
      id: "loading",
      svg: loadingSvg,
      color: "var(--theme-icon-palette)",
      onClick: () => {
        dockStore.resetLayout();
      },
    }),
  };

  function resolve(id: string): IconConfig | null {
    const factory = registry[id];
    return factory ? factory() : null;
  }

  return { resolve, showPalette };
}
