<template>
  <Transition name="update-dialog">
    <div v-if="showUpdateDialog" class="update-backdrop" @click.self="onClose">
      <div class="update-panel">
        <!-- checking -->
        <template v-if="state.status === 'checking'">
          <div class="update-spinner" />
          <p class="update-text">{{ $t("updateDialog.checking") }}</p>
        </template>

        <!-- available -->
        <template v-else-if="state.status === 'available'">
          <h3 class="update-title">
            {{ $t("updateDialog.available", { version: state.latestVersion }) }}
          </h3>
          <div class="update-actions">
            <button class="update-btn primary" @click="onDownload(state.assetUrl)">
              {{ $t("updateDialog.download") }}
            </button>
            <button class="update-btn secondary" @click="onClose">
              {{ $t("updateDialog.later") }}
            </button>
          </div>
        </template>

        <!-- downloading -->
        <template v-else-if="state.status === 'downloading'">
          <p class="update-text">{{ $t("updateDialog.downloading") }}</p>
          <div class="update-progress-bar">
            <div class="update-progress-fill" :style="{ width: progressPercent + '%' }" />
          </div>
          <p class="update-progress-text">
            {{ formatSize(state.downloaded) }} / {{ formatSize(state.total) }}
          </p>
        </template>

        <!-- ready (portable) -->
        <template v-else-if="state.status === 'ready' && state.isPortable">
          <p class="update-text">{{ $t("updateDialog.downloadComplete") }}</p>
          <p class="update-progress-text">{{ state.installerPath }}</p>
          <div class="update-actions">
            <button class="update-btn primary" @click="onOpenFolder(state.installerPath)">
              {{ $t("updateDialog.openFolder") }}
            </button>
            <button class="update-btn secondary" @click="onClose">
              {{ $t("updateDialog.close") }}
            </button>
          </div>
        </template>

        <!-- ready (installer) -->
        <template v-else-if="state.status === 'ready'">
          <p class="update-text">{{ $t("updateDialog.downloadComplete") }}</p>
          <div class="update-actions">
            <button class="update-btn primary" @click="onInstall(state.installerPath)">
              {{ $t("updateDialog.install") }}
            </button>
            <button class="update-btn secondary" @click="onClose">
              {{ $t("updateDialog.later") }}
            </button>
          </div>
        </template>

        <!-- up-to-date -->
        <template v-else-if="state.status === 'up-to-date'">
          <p class="update-text">{{ $t("updateDialog.upToDate") }}</p>
        </template>

        <!-- portable -->
        <template v-else-if="state.status === 'portable'">
          <h3 class="update-title">{{ $t("updateDialog.portableTitle") }}</h3>
          <p class="update-text">{{ $t("updateDialog.portableMessage") }}</p>
          <div class="update-actions">
            <button
              v-if="state.portableUrl"
              class="update-btn primary"
              @click="onDownloadPortable(state.portableUrl)"
            >
              {{ $t("updateDialog.downloadPortable") }}
            </button>
            <button class="update-btn secondary" @click="onOpenBrowser(state.releaseUrl)">
              {{ $t("updateDialog.downloadFromGitHub") }}
            </button>
            <button class="update-btn secondary" @click="onClose">
              {{ $t("updateDialog.cancel") }}
            </button>
          </div>
        </template>

        <!-- error -->
        <template v-else-if="state.status === 'error'">
          <p class="update-text update-error">{{ state.message }}</p>
          <div class="update-actions">
            <button class="update-btn primary" @click="onRetry">
              {{ $t("updateDialog.retry") }}
            </button>
            <button class="update-btn secondary" @click="onClose">
              {{ $t("updateDialog.cancel") }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount } from "vue";
import { showUpdateDialog } from "@/components/IconsConfig.vue";
import { useAppUpdate, type UpdateState } from "@/utils/useAppUpdate";

const { state, checkForUpdates, startDownload, install, openBrowser, reset } = useAppUpdate();

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  checkForUpdates();
});

watch(
  () => (state.value as UpdateState).status,
  (newStatus) => {
    if (newStatus === "up-to-date") {
      autoCloseTimer = setTimeout(() => {
        onClose();
      }, 2500);
    }
  }
);

onBeforeUnmount(() => {
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
});

function onClose() {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
  showUpdateDialog.value = false;
  reset();
}

function onDownload(assetUrl: string) {
  startDownload(assetUrl, false);
}

function onDownloadPortable(assetUrl: string) {
  startDownload(assetUrl, true);
}

function onInstall(installerPath: string) {
  install(installerPath);
}

function onOpenBrowser(url: string) {
  openBrowser(url);
}

function onOpenFolder(filePath: string) {
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  import("@tauri-apps/plugin-opener")
    .then(({ openUrl }) => openUrl("file:///" + dir.replace(/\\/g, "/")))
    .catch(() => {
      window.open("file:///" + dir.replace(/\\/g, "/"), "_blank");
    });
}

function onRetry() {
  checkForUpdates();
}

const progressPercent = computed(() => {
  const s = state.value;
  if (s.status !== "downloading" || s.total === 0) return 0;
  return Math.round((s.downloaded / s.total) * 100);
});

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
</script>

<style scoped>
.update-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(0deg 0% 0% / 35%);
}

.update-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 320px;
  max-width: 400px;
  padding: 28px 32px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 16px;
  box-shadow: 0 12px 40px hsl(0deg 0% 0% / 28%);
}

.update-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text);
  text-align: center;
}

.update-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text);
  text-align: center;
}

.update-error {
  color: var(--theme-icon-tasks);
}

.update-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.update-btn {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 10px;
  transition: opacity 0.15s ease;
}

.update-btn:hover {
  opacity: 0.85;
}

.update-btn.primary {
  color: #fff;
  background: var(--ring-progress);
}

.update-btn.secondary {
  color: var(--app-text);
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
}

.update-spinner {
  width: 32px;
  height: 32px;
  margin: 0 auto;
  border: 3px solid var(--dock-item-border);
  border-top-color: var(--ring-progress);
  border-radius: 50%;
  animation: update-spin 0.8s linear infinite;
}

@keyframes update-spin {
  to {
    transform: rotate(360deg);
  }
}

.update-progress-bar {
  width: 100%;
  height: 8px;
  overflow: hidden;
  background: var(--dock-item-bg);
  border-radius: 4px;
}

.update-progress-fill {
  height: 100%;
  background: var(--ring-progress);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.update-progress-text {
  margin: 0;
  font-family: "JetBrains Mono", "Cascadia Code", "Roboto Mono", monospace;
  font-size: 12px;
  color: var(--dock-item-color);
  text-align: center;
}

/* Transitions */
.update-dialog-enter-active,
.update-dialog-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.update-dialog-enter-active .update-panel,
.update-dialog-leave-active .update-panel {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.update-dialog-enter-from {
  opacity: 0;
}

.update-dialog-enter-from .update-panel {
  transform: scale(0.94);
}

.update-dialog-leave-to {
  opacity: 0;
}

.update-dialog-leave-to .update-panel {
  transform: scale(0.94);
}
</style>
