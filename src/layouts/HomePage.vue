<template>
  <main class="home-page-contain">
    <div class="home-page-toolbar-top-right">
      <IconDock :icons="topRightIcons" />
      <ColorPalette :visible="showPalette" @close="showPalette = false" />
    </div>
    <IconDock class="home-page-toolbar-bottom-left" :icons="bottomLeftIcons" />
    <FlipClock />
  </main>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import FlipClock from "@/components/FlipClock.vue";
import IconDock from "@/components/IconDock.vue";
import ColorPalette from "@/components/ColorPalette.vue";
import settingsSvg from "@/assets/Func-Settings.svg?raw";
import darkSvg from "@/assets/Model-Dark.svg?raw";
import lightSvg from "@/assets/Model-Light.svg?raw";
import paletteSvg from "@/assets/Model-Palette.svg?raw";

type ThemeContext = {
  isDark: { value: boolean };
  toggleThemeWithTransition: (point?: { x: number; y: number }) => void;
};

const theme = inject<ThemeContext>("theme");
if (!theme) {
  throw new Error("Theme context not provided");
}

const { isDark, toggleThemeWithTransition } = theme;

const showPalette = ref(false);

const topRightIcons = computed(() => [
  {
    id: "theme",
    svg: isDark.value ? darkSvg : lightSvg,
    color: isDark.value ? "var(--theme-icon-dark)" : "var(--theme-icon-light)",
    onClick: (event: MouseEvent) => {
      toggleThemeWithTransition({ x: event.clientX, y: event.clientY });
    },
  },
  {
    id: "palette",
    svg: paletteSvg,
    color: "var(--theme-icon-palette)",
    onClick: () => {
      showPalette.value = !showPalette.value;
    },
  },
]);

const bottomLeftIcons = [{ id: "settings", svg: settingsSvg, color: "var(--theme-icon-settings)" }];
</script>

<style scoped>
:global(:root) {
  --theme-icon-dark: #1077de;
  --theme-icon-light: #f59e0b;
  --theme-icon-palette: #f4359e;
  --theme-icon-settings: #ff1827;
}

.home-page-contain {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  padding: 24px;
}

.home-page-toolbar-top-right {
  position: absolute;
  top: 35px;
  right: 20px;
}

.home-page-toolbar-bottom-left {
  position: absolute;
  bottom: 35px;
  left: 20px;
}
</style>
