import { computed, type MaybeRef, type MaybeRefOrGetter, type WatchSource } from "vue";
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useTimeFormatStore } from "@/stores/TimeFormat";
import { useSoundToggleStore } from "@/stores/SoundToggle";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { useFocusTimerStore } from "@/stores/FocusTimer";
import { useCountClockStore } from "@/stores/CountClock";
import { useTaskStore } from "@/stores/TaskWindow";
import { useIconsUIStore } from "@/stores/IconsUI";
import { useUpdaterStore } from "@/stores/Updater";
import darkSvg from "@/assets/svg/Model-Dark.svg?raw";
import lightSvg from "@/assets/svg/Model-Light.svg?raw";
import time24Svg from "@/assets/svg/Model-24.svg?raw";
import time12Svg from "@/assets/svg/Model-12.svg?raw";
import paletteSvg from "@/assets/svg/Model-Palette.svg?raw";
import loadingSvg from "@/assets/svg/Model-Loading.svg?raw";
import soundOnSvg from "@/assets/svg/Model-SoundOn.svg?raw";
import soundMuteSvg from "@/assets/svg/Model-SoundMute.svg?raw";
import displaySvg from "@/assets/svg/Model-Display.svg?raw";
import hideSvg from "@/assets/svg/Model-Hide.svg?raw";
import countClockSvg from "@/assets/svg/Model-CountClock.svg?raw";
import homeSvg from "@/assets/svg/Model-Home.svg?raw";
import tasksSvg from "@/assets/svg/Model-Tasks.svg?raw";
import languageSvg from "@/assets/svg/Model-Language.svg?raw";
import updateSvg from "@/assets/svg/Model-Update.svg?raw";

export interface IconConfig {
  svg: MaybeRefOrGetter<string>;
  svgWatch?: WatchSource;
  color: MaybeRef<string>;
  onClick?: (e: MouseEvent) => void;
}

type IconStores = {
  theme: ReturnType<typeof useThemeModeStore>;
  time: ReturnType<typeof useTimeFormatStore>;
  sound: ReturnType<typeof useSoundToggleStore>;
  layout: ReturnType<typeof useIconsLayoutStore>;
  focus: ReturnType<typeof useFocusTimerStore>;
  count: ReturnType<typeof useCountClockStore>;
  task: ReturnType<typeof useTaskStore>;
  ui: ReturnType<typeof useIconsUIStore>;
  updater: ReturnType<typeof useUpdaterStore>;
};

let iconStores: IconStores | null = null;

export function iconStoresRef(): IconStores {
  return (iconStores ??= {
    theme: useThemeModeStore(),
    time: useTimeFormatStore(),
    sound: useSoundToggleStore(),
    layout: useIconsLayoutStore(),
    focus: useFocusTimerStore(),
    count: useCountClockStore(),
    task: useTaskStore(),
    ui: useIconsUIStore(),
    updater: useUpdaterStore(),
  });
}

const s = iconStoresRef;

let lastFocusToggle = 0;

function createFocusAction(action: () => void) {
  return () => {
    if (s().focus.isAnimating) return;
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
    svg: () => (s().theme.isDark ? darkSvg : lightSvg),
    svgWatch: () => s().theme.isDark,
    color: computed(() =>
      s().theme.isDark ? "var(--theme-icon-dark)" : "var(--theme-icon-light)"
    ),
    onClick: (e: MouseEvent) => s().theme.toggleThemeWithTransition({ x: e.clientX, y: e.clientY }),
  },
  palette: {
    svg: paletteSvg,
    color: "var(--theme-icon-palette)",
    onClick: () => {
      s().ui.showPalette = !s().ui.showPalette;
    },
  },
  "time-format": {
    svg: () => (s().time.is24h ? time24Svg : time12Svg),
    svgWatch: () => s().time.is24h,
    color: computed(() =>
      s().time.is24h ? "var(--theme-icon-time-24)" : "var(--theme-icon-time-12)"
    ),
    onClick: () => s().time.toggle(),
  },
  sound: {
    svg: () => (s().sound.isSoundOn ? soundOnSvg : soundMuteSvg),
    svgWatch: () => s().sound.isSoundOn,
    color: computed(() =>
      s().sound.isSoundOn ? "var(--theme-icon-sound-on)" : "var(--theme-icon-sound-mute)"
    ),
    onClick: () => s().sound.toggle(),
  },
  loading: {
    svg: loadingSvg,
    color: "var(--theme-icon-loading)",
    onClick: () => s().layout.resetLayout(),
  },
  "alarm-clock": {
    svg: () => generateAlarmClockSvg(s().focus.progress),
    svgWatch: () => Math.round(s().focus.progress * 360),
    color: "var(--theme-icon-alarm-clock)",
    onClick: createFocusAction(() => {
      if (s().count.isVisible) {
        s().count.isVisible = false;
      }
      s().focus.toggleVisibility();
    }),
  },
  "count-clock": {
    svg: countClockSvg,
    color: "var(--theme-icon-count-clock)",
    onClick: createFocusAction(() => {
      if (s().focus.isVisible) {
        s().focus.isVisible = false;
      }
      s().count.toggleVisibility();
    }),
  },
  home: {
    svg: homeSvg,
    color: "var(--theme-icon-home)",
    onClick: createFocusAction(() => {
      if (s().focus.hasFinished) {
        s().focus.stopAlarm();
      }
      if (s().focus.isVisible) {
        s().focus.isVisible = false;
      }
      if (s().count.isVisible) {
        s().count.isVisible = false;
      }
    }),
  },
  tasks: {
    svg: tasksSvg,
    color: "var(--theme-icon-tasks)",
    onClick: () => s().task.toggleVisibility(),
  },
  visibility: {
    svg: () => (s().ui.isIconsHidden ? hideSvg : displaySvg),
    svgWatch: () => s().ui.isIconsHidden,
    color: computed(() =>
      s().ui.isIconsHidden ? "var(--theme-icon-visible)" : "var(--theme-icon-hidden)"
    ),
    onClick: () => {
      s().ui.isIconsHidden = !s().ui.isIconsHidden;
      s().ui.manualIconOverride = true;
    },
  },
  update: {
    svg: updateSvg,
    color: "var(--theme-icon-update)",
    onClick: () => {
      void s().updater.checkForUpdate();
    },
  },
  language: {
    svg: languageSvg,
    color: "var(--theme-icon-language)",
    onClick: () => {
      s().ui.showLanguagePicker = !s().ui.showLanguagePicker;
    },
  },
};
