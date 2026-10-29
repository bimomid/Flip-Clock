import { defineStore } from "pinia";
import { ref } from "vue";

type ThemePoint = { x: number; y: number };

const TRANSITION_MS = 360;

export const useThemeModeStore = defineStore(
  "themeMode",
  () => {
    const isDark = ref(false);

    const prefersDarkQuery = "(prefers-color-scheme: dark)";

    function applyTheme(nextDark: boolean) {
      isDark.value = nextDark;
      document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    }

    function initTheme() {
      if (localStorage.getItem("themeMode") === null) {
        isDark.value = window.matchMedia?.(prefersDarkQuery)?.matches ?? false;
      }
      applyTheme(isDark.value);
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

      void transition.ready.then(() => {
        const radius = getRadius(x, y);
        const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];
        const goingDark = isDark.value;

        document.documentElement.animate(
          {
            clipPath: goingDark ? clipPath.reverse() : clipPath,
          },
          {
            duration: TRANSITION_MS,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
            pseudoElement: goingDark
              ? "::view-transition-old(root)"
              : "::view-transition-new(root)",
          }
        );
      });
    }

    return { isDark, initTheme, toggleThemeWithTransition };
  },
  {
    persist: { key: "themeMode", pick: ["isDark"] },
  }
);
