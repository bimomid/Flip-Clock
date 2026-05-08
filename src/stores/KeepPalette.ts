import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { useThemeModeStore } from "./ThemeMode";

// ---- 颜色工具函数 ----

interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHSL(hex: string): HSL | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ---- 调色板 Store ----

interface ColorOverrides {
  primary: HSL;
  secondary: HSL;
}

const CSS_PROPS = ["--p-h", "--p-s", "--p-l", "--s-h", "--s-s", "--s-l"] as const;

const LIGHT_DEFAULTS: ColorOverrides = {
  primary: { h: 40, s: 28, l: 95 },
  secondary: { h: 36, s: 90, l: 50 },
};

const DARK_DEFAULTS: ColorOverrides = {
  primary: { h: 221, s: 14, l: 18 },
  secondary: { h: 18, s: 30, l: 54 },
};

const hslEqual = (a: HSL, b: HSL) => a.h === b.h && a.s === b.s && a.l === b.l;

export const useKeepPaletteStore = defineStore(
  "keepPalette",
  () => {
    const themeStore = useThemeModeStore();

    const lightOverrides = ref<ColorOverrides | null>(null);
    const darkOverrides = ref<ColorOverrides | null>(null);

    function currentRef() {
      return themeStore.isDark ? darkOverrides : lightOverrides;
    }

    function currentDefaults(): ColorOverrides {
      return themeStore.isDark ? DARK_DEFAULTS : LIGHT_DEFAULTS;
    }

    function applyCurrentMode() {
      const overrides = currentRef().value;
      const root = document.documentElement;

      if (overrides) {
        root.style.setProperty("--p-h", String(overrides.primary.h));
        root.style.setProperty("--p-s", overrides.primary.s + "%");
        root.style.setProperty("--p-l", overrides.primary.l + "%");
        root.style.setProperty("--s-h", String(overrides.secondary.h));
        root.style.setProperty("--s-s", overrides.secondary.s + "%");
        root.style.setProperty("--s-l", overrides.secondary.l + "%");
      } else {
        for (const prop of CSS_PROPS) root.style.removeProperty(prop);
      }
    }

    function init() {
      applyCurrentMode();
    }

    function setColor(key: "primary" | "secondary", hsl: HSL) {
      const ref = currentRef();
      if (!ref.value) ref.value = { ...currentDefaults() };
      ref.value[key] = hsl;
      applyCurrentMode();
    }

    function resetColor(key: "primary" | "secondary") {
      const ref = currentRef();
      const cur = ref.value;
      if (!cur) return;

      const defs = currentDefaults();
      const other = key === "primary" ? "secondary" : "primary";

      if (hslEqual(cur[other], defs[other])) {
        ref.value = null;
      } else {
        cur[key] = { ...defs[key] };
      }
      applyCurrentMode();
    }

    const hasCustom = (key: "primary" | "secondary") => {
      const o = currentRef().value;
      if (!o) return false;
      return !hslEqual(o[key], currentDefaults()[key]);
    };

    const hasPrimaryCustom = computed(() => hasCustom("primary"));
    const hasSecondaryCustom = computed(() => hasCustom("secondary"));

    watch(() => themeStore.isDark, applyCurrentMode);

    return {
      lightOverrides,
      darkOverrides,
      init,
      hasPrimaryCustom,
      hasSecondaryCustom,
      setPrimary: (hsl: HSL) => setColor("primary", hsl),
      setSecondary: (hsl: HSL) => setColor("secondary", hsl),
      resetPrimary: () => resetColor("primary"),
      resetSecondary: () => resetColor("secondary"),
    };
  },
  {
    persist: {
      key: "flip-clock-colors",
      pick: ["lightOverrides", "darkOverrides"],
      serializer: {
        deserialize(value: string) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
              return {
                lightOverrides: parsed.lightOverrides ?? parsed.light ?? null,
                darkOverrides: parsed.darkOverrides ?? parsed.dark ?? null,
              };
            }
          } catch {
            /* 数据损坏 */
          }
          return { lightOverrides: null, darkOverrides: null };
        },
        serialize: JSON.stringify,
      },
    },
  }
);
