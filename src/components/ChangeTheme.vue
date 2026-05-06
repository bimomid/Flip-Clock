<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from "vue";

type ThemePoint = {
  x: number;
  y: number;
};

type ThemeContext = {
  isDark: typeof isDark;
  toggleThemeWithTransition: typeof toggleThemeWithTransition;
};

const prefersDarkQuery = "(prefers-color-scheme: dark)";

const isDark = ref(false);

function applyTheme(nextDark: boolean) {
  isDark.value = nextDark;
  const root = document.documentElement;
  root.dataset.theme = nextDark ? "dark" : "light";
}

function initTheme() {
  const media = window.matchMedia?.(prefersDarkQuery);
  applyTheme(media?.matches ?? false);
}

function getFallbackPoint(): ThemePoint {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function getRadius(x: number, y: number) {
  return Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
}

function toggleThemeWithTransition(point?: ThemePoint) {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!document.startViewTransition || prefersReduced) {
    applyTheme(!isDark.value);
    return;
  }

  const { x, y } = point ?? getFallbackPoint();
  const transition = document.startViewTransition(() => {
    applyTheme(!isDark.value);
  });

  transition.ready.then(() => {
    const radius = getRadius(x, y);
    const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];

    document.documentElement.animate(
      { clipPath: isDark.value ? clipPath.reverse() : clipPath },
      {
        duration: 360,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
        pseudoElement: isDark.value ? "::view-transition-old(root)" : "::view-transition-new(root)",
      }
    );
  });
}

provide<ThemeContext>("theme", {
  isDark,
  toggleThemeWithTransition,
});

onMounted(() => {
  initTheme();
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
