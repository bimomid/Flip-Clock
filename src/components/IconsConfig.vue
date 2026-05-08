<template>
  <slot />
</template>

<script lang="ts">
import { ref, computed } from "vue";
import type { DockPosition } from "@/stores/IconsDrag";
import type { IconConfig } from "@/components/SvgIcon.vue";
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useTimeFormatStore } from "@/stores/TimeFormat";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import darkSvg from "@/assets/svg/Model-Dark.svg?raw";
import lightSvg from "@/assets/svg/Model-Light.svg?raw";
import time24Svg from "@/assets/svg/Model-24.svg?raw";
import time12Svg from "@/assets/svg/Model-12.svg?raw";
import paletteSvg from "@/assets/svg/Model-Palette.svg?raw";
import settingsSvg from "@/assets/svg/Model-Settings.svg?raw";
import loadingSvg from "@/assets/svg/Model-Loading.svg?raw";

export const showPalette = ref(false);

export const defaultLayout: Record<DockPosition, string[]> = {
  "top-left": [],
  "top-right": ["theme", "palette", "time-format"],
  "bottom-left": ["settings"],
  "bottom-right": ["loading"],
};

const themeStore = useThemeModeStore();
const timeStore = useTimeFormatStore();
const layoutStore = useIconsLayoutStore();

export const iconConfigMap: Record<string, IconConfig> = {
  theme: {
    svg: () => (themeStore.isDark ? darkSvg : lightSvg),
    svgWatch: () => themeStore.isDark,
    color: computed(() =>
      themeStore.isDark ? "var(--theme-icon-dark)" : "var(--theme-icon-light)"
    ),
    onClick: (e: MouseEvent) =>
      themeStore.toggleThemeWithTransition({ x: e.clientX, y: e.clientY }),
  },
  palette: {
    svg: paletteSvg,
    color: "var(--theme-icon-palette)",
    onClick: () => {
      showPalette.value = !showPalette.value;
    },
  },
  "time-format": {
    svg: () => (timeStore.is24h ? time24Svg : time12Svg),
    svgWatch: () => timeStore.is24h,
    color: computed(() =>
      timeStore.is24h ? "var(--theme-icon-time-24)" : "var(--theme-icon-time-12)"
    ),
    onClick: () => timeStore.toggle(),
  },
  settings: {
    svg: settingsSvg,
    color: "var(--theme-icon-settings)",
  },
  loading: {
    svg: loadingSvg,
    color: "var(--theme-icon-loading)",
    onClick: () => layoutStore.resetLayout(),
  },
};
</script>

<script setup lang="ts">
import { onMounted } from "vue";
import { useKeepPaletteStore } from "@/stores/KeepPalette";

const paletteStore = useKeepPaletteStore();

onMounted(() => {
  themeStore.initTheme();
  paletteStore.init();
});
</script>

<style lang="scss" scoped>
:global(:root) {
  --theme-icon-dark: #1077de;
  --theme-icon-light: #f59e0b;
  --theme-icon-palette: #f4359e;
  --theme-icon-time-12: #10b981;
  --theme-icon-time-24: #8b5cf6;
  --theme-icon-settings: #ff1827;
  --theme-icon-loading: #6366f1;
}

:global(html) {
  background: var(--app-bg);
}

:global(body) {
  background: var(--app-bg);
  color: var(--app-text);
}

:global(::view-transition-new(root)),
:global(::view-transition-old(root)) {
  animation: none !important;
}

:global(html[data-theme="dark"]::view-transition-old(root)) {
  z-index: 100;
}
</style>
