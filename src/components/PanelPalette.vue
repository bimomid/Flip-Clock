<template>
  <Transition name="palette">
    <div v-if="showPalette" class="palette-backdrop" @click.self="showPalette = false">
      <div class="palette-panel">
        <div class="palette-row">
          <span class="palette-row-label">{{ $t("palette.primaryColor") }}</span>
          <div class="palette-dots">
            <button
              v-for="(preset, i) in primaryPresets"
              :key="'p-' + i"
              class="palette-dot"
              :style="{ backgroundColor: primaryHex(preset) }"
              :title="preset.name"
              @click="onPickPrimary(preset)"
            ></button>
            <button
              class="palette-dot palette-dot-picker"
              :title="$t('palette.customColor')"
              @click="openCustomPicker('primary')"
            ></button>
            <button
              class="palette-dot palette-dot-reset"
              :title="$t('palette.resetPrimary')"
              :disabled="!paletteStore.hasPrimaryCustom"
              @click="paletteStore.resetPrimary()"
            >
              <span class="reset-icon" v-html="resetSvg" />
            </button>
          </div>
        </div>

        <div class="palette-row">
          <span class="palette-row-label">{{ $t("palette.secondaryColor") }}</span>
          <div class="palette-dots">
            <button
              v-for="(preset, i) in secondaryPresets"
              :key="'s-' + i"
              class="palette-dot"
              :style="{ backgroundColor: secondaryHex(preset) }"
              :title="preset.name"
              @click="onPickSecondary(preset)"
            ></button>
            <button
              class="palette-dot palette-dot-picker"
              :title="$t('palette.customColor')"
              @click="openCustomPicker('secondary')"
            ></button>
            <button
              class="palette-dot palette-dot-reset"
              :title="$t('palette.resetSecondary')"
              :disabled="!paletteStore.hasSecondaryCustom"
              @click="paletteStore.resetSecondary()"
            >
              <span class="reset-icon" v-html="resetSvg" />
            </button>
          </div>
        </div>

        <input ref="customInput" type="color" class="visually-hidden" @input="onCustomPick" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useKeepPaletteStore, hexToHSL, hslToHex } from "@/stores/KeepPalette";
import { showPalette } from "@/components/IconsConfig.vue";
import resetSvg from "@/assets/svg/Func-Reset.svg?raw";

const { t } = useI18n();

const themeStore = useThemeModeStore();
const paletteStore = useKeepPaletteStore();

const customInput = ref<HTMLInputElement | null>(null);
const customTarget = ref<"primary" | "secondary">("primary");

interface Preset {
  name: string;
  h: number;
  s: number;
}

const primaryPresets = computed<Preset[]>(() => [
  { name: t("presets.warmBeige"), h: 40, s: 28 },
  { name: t("presets.coolGray"), h: 220, s: 10 },
  { name: t("presets.sage"), h: 120, s: 12 },
  { name: t("presets.lavender"), h: 270, s: 12 },
]);

const secondaryPresets = computed<Preset[]>(() => [
  { name: t("presets.goldenOrange"), h: 36, s: 90 },
  { name: t("presets.skyBlue"), h: 210, s: 75 },
  { name: t("presets.emeraldGreen"), h: 150, s: 65 },
  { name: t("presets.roseRed"), h: 330, s: 70 },
]);

const primaryL = computed(() => (themeStore.isDark ? 18 : 95));
const secondaryL = computed(() => (themeStore.isDark ? 54 : 50));

function primaryHex(p: Preset): string {
  return hslToHex(p.h, p.s, primaryL.value);
}
function secondaryHex(p: Preset): string {
  return hslToHex(p.h, p.s, secondaryL.value);
}

function onPickPrimary(p: Preset) {
  paletteStore.setPrimary({ h: p.h, s: p.s, l: primaryL.value });
}

function onPickSecondary(p: Preset) {
  paletteStore.setSecondary({ h: p.h, s: p.s, l: secondaryL.value });
}

function openCustomPicker(target: "primary" | "secondary") {
  customTarget.value = target;
  customInput.value?.click();
}

function onCustomPick(event: Event) {
  const target = event.target as HTMLInputElement;
  const hsl = hexToHSL(target.value);
  if (!hsl) return;
  if (customTarget.value === "primary") {
    paletteStore.setPrimary(hsl);
  } else {
    paletteStore.setSecondary(hsl);
  }
}
</script>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 88px 20px 0 0;
}

.palette-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px hsl(0deg 0% 0% / 18%);
}

.palette-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.palette-row-label {
  min-width: 42px;
  font-size: 12px;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
}

.palette-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.palette-dot {
  width: 26px;
  height: 26px;
  padding: 0;
  cursor: pointer;
  border: 2px solid var(--dock-item-border);
  border-radius: 50%;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.palette-dot:hover:not(:disabled) {
  border-color: var(--dock-item-border-hover);
  box-shadow: 0 0 0 3px hsl(var(--s-h) var(--s-s) var(--s-l) / 25%);
  transform: scale(1.2);
}

.palette-dot-picker {
  background: conic-gradient(
    hsl(0deg 80% 55%),
    hsl(45deg 80% 55%),
    hsl(90deg 80% 45%),
    hsl(180deg 80% 50%),
    hsl(270deg 80% 55%),
    hsl(315deg 80% 50%),
    hsl(0deg 80% 55%)
  ) !important;
}

.palette-dot-reset {
  display: grid;
  place-items: center;
  background: var(--dock-item-bg) !important;
  border-style: dashed;
}

.palette-dot-reset:disabled {
  cursor: default;
  box-shadow: none !important;
  opacity: 0.3;
  transform: none !important;
}

.reset-icon {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  color: var(--dock-item-color);
}

.reset-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.visually-hidden {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  opacity: 0;
}

.palette-enter-active,
.palette-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
