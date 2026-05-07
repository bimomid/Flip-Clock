import { defineStore } from "pinia";
import { ref } from "vue";

type ThemePoint = { x: number; y: number };

export const useThemeStore = defineStore("theme", () => {
  const isDark = ref(false);
  const ready = ref(false);

  const prefersDarkQuery = "(prefers-color-scheme: dark)";

  function applyTheme(nextDark: boolean) {
    isDark.value = nextDark;
    const root = document.documentElement;
    root.dataset.theme = nextDark ? "dark" : "light";
  }

  function initTheme() {
    const media = window.matchMedia?.(prefersDarkQuery);
    applyTheme(media?.matches ?? false);
    ready.value = true;
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
        {
          clipPath: isDark.value ? clipPath.reverse() : clipPath,
        },
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
          pseudoElement: isDark.value
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      );
    });
  }

  return { isDark, ready, initTheme, toggleThemeWithTransition };
});
