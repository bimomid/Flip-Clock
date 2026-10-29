<template>
  <Transition name="update">
    <div v-if="store.status !== 'idle'" class="update-backdrop" @click.self="onBackdrop">
      <div
        class="update-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('updater.titleIdle')"
      >
        <div class="update-title">
          {{ titleText }}
          <span v-if="store.version" class="update-version">v{{ store.version }}</span>
        </div>

        <div v-if="store.status === 'checking'" class="update-body">
          {{ $t("updater.checking") }}
        </div>

        <div v-else-if="store.status === 'available'" class="update-body">
          <p class="update-line">{{ $t("updater.available") }}</p>
          <p v-if="store.mode === 'manual'" class="update-line update-hint">
            {{ $t("updater.manualHint") }}
          </p>
          <pre v-if="store.notes" class="update-notes">{{ store.notes }}</pre>
        </div>

        <div v-else-if="store.status === 'up-to-date'" class="update-body">
          {{ $t("updater.upToDate", { version: store.currentVersion }) }}
        </div>

        <div v-else-if="store.status === 'downloading'" class="update-body">
          <p class="update-line">{{ $t("updater.downloading") }}</p>
          <div class="update-bar">
            <div
              class="update-bar-fill"
              :style="{ width: `${Math.round(store.progress * 100)}%` }"
            />
          </div>
          <p class="update-percent">{{ Math.round(store.progress * 100) }}%</p>
        </div>

        <div v-else-if="store.status === 'ready'" class="update-body">
          {{ $t("updater.ready") }}
        </div>

        <div v-else class="update-body update-error">
          {{ store.timedOut ? $t("updater.timeout") : $t("updater.failed") }}
          <pre v-if="store.error" class="update-notes">{{ store.error }}</pre>
        </div>

        <div class="update-actions">
          <button
            v-if="showDownload"
            class="update-btn update-btn-primary"
            @click="store.openDownloadPage()"
          >
            {{ $t("updater.openDownload") }}
          </button>
          <button
            v-else-if="store.status === 'available'"
            class="update-btn update-btn-primary"
            @click="store.downloadAndInstall()"
          >
            {{ $t("updater.download") }}
          </button>
          <button
            v-else-if="store.status === 'ready'"
            class="update-btn update-btn-primary"
            @click="store.restart()"
          >
            {{ $t("updater.restart") }}
          </button>
          <button v-if="store.status === 'error'" class="update-btn" @click="retry">
            {{ $t("updater.retry") }}
          </button>
          <button v-if="store.status !== 'downloading'" class="update-btn" @click="store.dismiss()">
            {{ $t("updater.later") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useUpdaterStore } from "@/stores/Updater";

const { t } = useI18n();
const store = useUpdaterStore();

/** 移动端检查失败/超时也保留“前往下载”，否则用户没有任何出路。 */
const showDownload = computed(
  () => store.mode === "manual" && (store.status === "available" || store.status === "error")
);

const titleText = computed(() => {
  const announcing = store.status === "available" || store.status === "ready";
  return announcing ? t("updater.title") : t("updater.titleIdle");
});

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  onBackdrop();
}

watch(
  () => store.status !== "idle",
  (open) => {
    if (open) window.addEventListener("keydown", onKeydown);
    else window.removeEventListener("keydown", onKeydown);
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});

function retry() {
  store.dismiss();
  void store.checkForUpdate();
}

function onBackdrop() {
  if (store.status === "downloading") return;
  store.dismiss();
}
</script>

<style scoped>
.update-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(0deg 0% 0% / 35%);
}

.update-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(360px, calc(100vw - 48px));
  padding: 22px 24px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 14px;
  box-shadow: 0 12px 40px hsl(0deg 0% 0% / 28%);
}

.update-title {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text);
}

.update-version {
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--ring-progress);
}

.update-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text);
}

.update-line {
  margin: 0;
}

.update-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.7;
}

.update-notes {
  max-height: 120px;
  padding: 8px 10px;
  margin: 8px 0 0;
  overflow: auto;
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: 11px;
  white-space: pre-wrap;
  background: var(--dock-item-bg);
  border-radius: 8px;
}

.update-error {
  color: #ef4444;
}

.update-bar {
  height: 6px;
  margin-top: 10px;
  overflow: hidden;
  background: var(--dock-item-bg);
  border-radius: 999px;
}

.update-bar-fill {
  height: 100%;
  background: var(--ring-progress);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.update-percent {
  margin: 6px 0 0;
  font-size: 11px;
  text-align: right;
  opacity: 0.6;
}

.update-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.update-btn {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  cursor: pointer;
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
  border-radius: 8px;
  transition:
    border-color 0.15s ease,
    opacity 0.15s ease;
}

.update-btn:hover {
  border-color: var(--dock-item-border-hover);
}

.update-btn-primary {
  color: #fff;
  background: var(--ring-progress);
  border-color: transparent;
}

.update-btn-primary:hover {
  opacity: 0.85;
}

.update-enter-active,
.update-leave-active {
  transition: opacity 0.2s ease;
}

.update-enter-from,
.update-leave-to {
  opacity: 0;
}
</style>
