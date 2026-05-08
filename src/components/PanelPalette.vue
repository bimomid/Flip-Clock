<template>
  <Transition name="palette">
    <div v-if="showPalette" class="palette-backdrop" @click.self="showPalette = false">
      <div class="palette-panel">
        <div class="palette-row">
          <span class="palette-row-label">主色调</span>
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
              title="自定义颜色"
              @click="openCustomPicker('primary')"
            ></button>
            <button
              class="palette-dot palette-dot-reset"
              title="重置主色调"
              :disabled="!paletteStore.hasPrimaryCustom"
              @click="paletteStore.resetPrimary()"
            >
              <span class="reset-icon">↺</span>
            </button>
          </div>
        </div>

        <div class="palette-row">
          <span class="palette-row-label">副色调</span>
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
              title="自定义颜色"
              @click="openCustomPicker('secondary')"
            ></button>
            <button
              class="palette-dot palette-dot-reset"
              title="重置副色调"
              :disabled="!paletteStore.hasSecondaryCustom"
              @click="paletteStore.resetSecondary()"
            >
              <span class="reset-icon">↺</span>
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
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useKeepPaletteStore, hexToHSL, hslToHex } from "@/stores/KeepPalette";
import { showPalette } from "@/components/IconsConfig.vue";

const themeStore = useThemeModeStore();
const paletteStore = useKeepPaletteStore();

const customInput = ref<HTMLInputElement | null>(null);
const customTarget = ref<"primary" | "secondary">("primary");

interface Preset {
  name: string;
  h: number;
  s: number;
}

const primaryPresets: Preset[] = [
  { name: "暖米", h: 40, s: 28 },
  { name: "冷灰", h: 220, s: 10 },
  { name: "鼠尾草", h: 120, s: 12 },
  { name: "薰衣草", h: 270, s: 12 },
];

const secondaryPresets: Preset[] = [
  { name: "金橙", h: 36, s: 90 },
  { name: "天蓝", h: 210, s: 75 },
  { name: "翠绿", h: 150, s: 65 },
  { name: "玫红", h: 330, s: 70 },
];

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
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--dock-item-color);
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
