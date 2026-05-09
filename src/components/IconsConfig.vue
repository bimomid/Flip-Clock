<template>
  <slot />
</template>

<script lang="ts">
import { ref, computed } from "vue";
import type { DockPosition } from "@/stores/IconsDrag";
import type { IconConfig } from "@/components/SvgIcon.vue";
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useTimeFormatStore } from "@/stores/TimeFormat";
import { useSoundToggleStore } from "@/stores/SoundToggle";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { useFocusTimerStore } from "@/stores/FocusTimer";
import darkSvg from "@/assets/svg/Model-Dark.svg?raw";
import lightSvg from "@/assets/svg/Model-Light.svg?raw";
import time24Svg from "@/assets/svg/Model-24.svg?raw";
import time12Svg from "@/assets/svg/Model-12.svg?raw";
import paletteSvg from "@/assets/svg/Model-Palette.svg?raw";
import settingsSvg from "@/assets/svg/Model-Settings.svg?raw";
import loadingSvg from "@/assets/svg/Model-Loading.svg?raw";
import soundOnSvg from "@/assets/svg/Model-SoundOn.svg?raw";
import soundMuteSvg from "@/assets/svg/Model-SoundMute.svg?raw";

import countClockSvg from "@/assets/svg/Model-CountClock.svg?raw";
import homeSvg from "@/assets/svg/Model-Home.svg?raw";
import tasksSvg from "@/assets/svg/Model-Tasks.svg?raw";

export const showPalette = ref(false);

export const defaultLayout: Record<DockPosition, string[]> = {
  "top-left": ["home", "alarm-clock", "count-clock", "tasks"],
  "top-right": ["theme", "palette", "time-format", "sound"],
  "bottom-left": ["settings"],
  "bottom-right": ["loading"],
  top: [],
  bottom: [],
};

const themeStore = useThemeModeStore();
const timeStore = useTimeFormatStore();
const soundStore = useSoundToggleStore();
const layoutStore = useIconsLayoutStore();
const focusTimerStore = useFocusTimerStore();

let lastFocusToggle = 0;

function createFocusAction(action: () => void) {
  return () => {
    if (focusTimerStore.isAnimating) return;
    const now = Date.now();
    if (now - lastFocusToggle < 400) return;
    lastFocusToggle = now;
    action();
  };
}

function generateAlarmClockSvg(progress: number): string {
  const angle = Math.round(progress * 360);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24">
<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
  <circle cx="12" cy="13" r="9"/>
  <g transform="rotate(${angle} 12 13)">
    <path d="M12 13V8"/>
  </g>
  <path d="M19 19l1 3M5 19l-1 3M2 5l3-3m14 0l3 3M12 4V2"/>
</g>
</svg>`;
}

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
  sound: {
    svg: () => (soundStore.isSoundOn ? soundOnSvg : soundMuteSvg),
    svgWatch: () => soundStore.isSoundOn,
    color: computed(() =>
      soundStore.isSoundOn ? "var(--theme-icon-sound-on)" : "var(--theme-icon-sound-mute)"
    ),
    onClick: () => soundStore.toggle(),
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
  "alarm-clock": {
    svg: () => generateAlarmClockSvg(focusTimerStore.progress),
    svgWatch: () => focusTimerStore.progress,
    color: "var(--theme-icon-alarm-clock)",
    onClick: createFocusAction(() => focusTimerStore.toggleVisibility()),
  },
  "count-clock": {
    svg: countClockSvg,
    color: "var(--theme-icon-count-clock)",
  },
  home: {
    svg: homeSvg,
    color: "var(--theme-icon-home)",
    onClick: createFocusAction(() => {
      if (focusTimerStore.hasFinished) {
        focusTimerStore.stopAlarm();
      }
      if (focusTimerStore.isVisible) {
        focusTimerStore.isVisible = false;
      }
    }),
  },
  tasks: {
    svg: tasksSvg,
    color: "var(--theme-icon-tasks)",
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
  --theme-icon-dark: #3b82f6;
  --theme-icon-light: #fbbf24;
  --theme-icon-palette: #ec4899;
  --theme-icon-time-12: #10b981;
  --theme-icon-time-24: #8b5cf6;
  --theme-icon-settings: #ef4444;
  --theme-icon-loading: #6366f1;
  --theme-icon-sound-on: #0ea5e9;
  --theme-icon-sound-mute: #9ca3af;
  --theme-icon-alarm-clock: #f59e0b;
  --theme-icon-count-clock: #14b8a6;
  --theme-icon-home: #f97316;
  --theme-icon-tasks: #e11d48;
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
