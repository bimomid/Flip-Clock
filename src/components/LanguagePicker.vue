<template>
  <Transition name="lang">
    <div
      v-if="ui.showLanguagePicker"
      class="lang-backdrop"
      @click.self="ui.showLanguagePicker = false"
    >
      <div class="lang-panel" role="dialog" aria-modal="true" :aria-label="$t('icons.language')">
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          class="lang-option"
          :class="{ active: locale.code === currentLocale }"
          @click="switchTo(locale.code)"
        >
          {{ locale.name }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import i18n, { availableLocales, setLocale } from "@/languages";
import { useIconsUIStore } from "@/stores/IconsUI";
import { useEscapeKey } from "@/composables/useEscapeKey";

const ui = useIconsUIStore();

useEscapeKey(
  computed(() => ui.showLanguagePicker),
  () => {
    ui.showLanguagePicker = false;
  }
);

const currentLocale = computed(() => i18n.global.locale.value);

function switchTo(code: string) {
  setLocale(code);
  ui.showLanguagePicker = false;
}
</script>

<style scoped>
.lang-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0 0 82px 20px;
}

.lang-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 10px;
  box-shadow: 0 8px 32px hsl(0deg 0% 0% / 18%);
}

.lang-option {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.lang-option:hover {
  color: var(--ring-progress);
  background: var(--dock-item-bg);
}

.lang-option.active {
  font-weight: 700;
  color: var(--ring-progress);
}

.lang-enter-active,
.lang-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lang-enter-from,
.lang-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
