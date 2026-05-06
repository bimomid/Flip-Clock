import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { type HSL, hslToHex } from "@/utils/color-utils";

interface ColorOverrides {
  primary: HSL;
  secondary: HSL;
}

interface StoredColors {
  light: ColorOverrides | null;
  dark: ColorOverrides | null;
}

export interface ThemeColorsContext {
  activePrimaryHex: ComputedRef<string>;
  activeSecondaryHex: ComputedRef<string>;
  setPrimary: (hsl: HSL) => void;
  setSecondary: (hsl: HSL) => void;
  resetCurrentMode: () => void;
  hasCustom: ComputedRef<boolean>;
}

const STORAGE_KEY = "flip-clock-colors";

const CSS_PROPS = ["--p-h", "--p-s", "--p-l", "--s-h", "--s-s", "--s-l"] as const;

const LIGHT_DEFAULTS: ColorOverrides = {
  primary: { h: 40, s: 28, l: 95 },
  secondary: { h: 36, s: 90, l: 50 },
};

const DARK_DEFAULTS: ColorOverrides = {
  primary: { h: 221, s: 14, l: 18 },
  secondary: { h: 18, s: 30, l: 54 },
};

function readStorage(): StoredColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { light: null, dark: null };
    return JSON.parse(raw) as StoredColors;
  } catch {
    return { light: null, dark: null };
  }
}

function persist(state: StoredColors): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useThemeColors(isDark: Ref<boolean>) {
  const lightOverrides = ref<ColorOverrides | null>(null);
  const darkOverrides = ref<ColorOverrides | null>(null);
  const ready = ref(false);

  function init() {
    const stored = readStorage();
    lightOverrides.value = stored.light;
    darkOverrides.value = stored.dark;
    ready.value = true;
    applyCurrentMode();
  }

  function persistCurrent() {
    persist({
      light: lightOverrides.value,
      dark: darkOverrides.value,
    });
  }

  function applyCurrentMode() {
    const overrides = isDark.value ? darkOverrides.value : lightOverrides.value;
    const root = document.documentElement;

    if (overrides) {
      root.style.setProperty("--p-h", String(overrides.primary.h));
      root.style.setProperty("--p-s", overrides.primary.s + "%");
      root.style.setProperty("--p-l", overrides.primary.l + "%");
      root.style.setProperty("--s-h", String(overrides.secondary.h));
      root.style.setProperty("--s-s", overrides.secondary.s + "%");
      root.style.setProperty("--s-l", overrides.secondary.l + "%");
    } else {
      for (const prop of CSS_PROPS) {
        root.style.removeProperty(prop);
      }
    }
  }

  const activeOverrides = computed<ColorOverrides | null>(() =>
    isDark.value ? darkOverrides.value : lightOverrides.value
  );

  function currentDefaults(): ColorOverrides {
    return isDark.value ? DARK_DEFAULTS : LIGHT_DEFAULTS;
  }

  const activePrimaryHex = computed<string>(() => {
    const o = activeOverrides.value;
    if (o) return hslToHex(o.primary.h, o.primary.s, o.primary.l);
    const d = currentDefaults();
    return hslToHex(d.primary.h, d.primary.s, d.primary.l);
  });

  const activeSecondaryHex = computed<string>(() => {
    const o = activeOverrides.value;
    if (o) return hslToHex(o.secondary.h, o.secondary.s, o.secondary.l);
    const d = currentDefaults();
    return hslToHex(d.secondary.h, d.secondary.s, d.secondary.l);
  });

  const hasCustom = computed<boolean>(() => activeOverrides.value !== null);

  function ensureMode(key: "light" | "dark"): ColorOverrides {
    if (key === "light") {
      if (!lightOverrides.value) {
        lightOverrides.value = { ...LIGHT_DEFAULTS };
      }
      return lightOverrides.value;
    } else {
      if (!darkOverrides.value) {
        darkOverrides.value = { ...DARK_DEFAULTS };
      }
      return darkOverrides.value;
    }
  }

  function setPrimary(hsl: HSL) {
    const overrides = ensureMode(isDark.value ? "dark" : "light");
    overrides.primary = hsl;
    applyCurrentMode();
    persistCurrent();
  }

  function setSecondary(hsl: HSL) {
    const overrides = ensureMode(isDark.value ? "dark" : "light");
    overrides.secondary = hsl;
    applyCurrentMode();
    persistCurrent();
  }

  function resetCurrentMode() {
    if (isDark.value) {
      darkOverrides.value = null;
    } else {
      lightOverrides.value = null;
    }
    applyCurrentMode();
    persistCurrent();
  }

  watch(isDark, () => {
    if (ready.value) {
      applyCurrentMode();
    }
  });

  return {
    activePrimaryHex,
    activeSecondaryHex,
    setPrimary,
    setSecondary,
    resetCurrentMode,
    hasCustom,
    init,
  };
}
