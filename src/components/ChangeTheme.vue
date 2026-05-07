<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useThemeStore } from "@/stores/theme";
import { useThemeColorsStore } from "@/stores/themeColors";

const themeStore = useThemeStore();
const themeColorsStore = useThemeColorsStore();

onMounted(() => {
  themeStore.initTheme();
  themeColorsStore.init();
});
</script>

<style lang="scss" scoped>
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
