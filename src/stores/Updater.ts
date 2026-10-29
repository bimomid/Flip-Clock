import { ref } from "vue";
import { defineStore } from "pinia";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { isAndroidPlatform } from "@/services/platform";
import { TimeoutError, withTimeout } from "@/utils/async";
import { isNewerVersion } from "@/utils/version";

/** 检查更新的兜底上限：DNS 污染/丢包时原生请求可能长时间无响应。 */
const CHECK_TIMEOUT_MS = 25_000;

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

/** auto：桌面端，可下载并安装；manual：移动端，只能引导到下载页手动安装。 */
export type UpdateMode = "auto" | "manual";

interface LatestRelease {
  version: string;
  notes: string;
  page: string;
}

export const useUpdaterStore = defineStore("updater", () => {
  const status = ref<UpdateStatus>("idle");
  const mode = ref<UpdateMode>("auto");
  const version = ref("");
  const notes = ref("");
  const progress = ref(0);
  const error = ref("");
  const timedOut = ref(false);
  const currentVersion = ref("");
  const downloadPage = ref("https://github.com/bimomid/Flip-Clock/releases/latest");

  let pending: Update | null = null;

  function reset() {
    status.value = "idle";
    version.value = "";
    notes.value = "";
    progress.value = 0;
    error.value = "";
    timedOut.value = false;
    const closing = pending;
    pending = null;
    if (closing) void closing.close().catch(() => {});
  }

  /** Android 无法静默安装 APK，改为读取 latest.json 比对版本，再引导到下载页。 */
  async function checkManualUpdate() {
    const release = await invoke<LatestRelease>("fetch_latest_release");
    if (!release.version) {
      throw new Error("latest.json has no version field");
    }
    downloadPage.value = release.page || downloadPage.value;
    mode.value = "manual";
    if (!isNewerVersion(release.version, currentVersion.value)) {
      status.value = "up-to-date";
      return;
    }
    version.value = release.version;
    notes.value = release.notes;
    status.value = "available";
  }

  async function runCheck() {
    mode.value = isAndroidPlatform() ? "manual" : "auto";
    if (mode.value === "manual") {
      await checkManualUpdate();
      return;
    }

    const update = await check();
    if (!update) {
      status.value = "up-to-date";
      return;
    }
    pending = update;
    version.value = update.version;
    notes.value = update.body ?? "";
    status.value = "available";
  }

  async function checkForUpdate() {
    if (status.value === "checking" || status.value === "downloading") return;

    status.value = "checking";
    error.value = "";
    timedOut.value = false;

    try {
      currentVersion.value = await getVersion();
      // 双保险：即使原生请求既不成功也不失败，25s 后界面也要给出结果。
      await withTimeout(runCheck(), CHECK_TIMEOUT_MS);
    } catch (e) {
      timedOut.value = e instanceof TimeoutError;
      error.value = timedOut.value ? "" : e instanceof Error ? e.message : String(e);
      status.value = "error";
    }
  }

  async function downloadAndInstall() {
    if (!pending || status.value === "downloading") return;

    status.value = "downloading";
    progress.value = 0;

    let total = 0;
    let received = 0;

    try {
      await pending.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          progress.value = total > 0 ? Math.min(1, received / total) : 0;
        } else if (event.event === "Finished") {
          progress.value = 1;
        }
      });
      status.value = "ready";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      status.value = "error";
    }
  }

  /** 移动端：用系统浏览器打开发布页，用户自行下载 APK 覆盖安装。 */
  async function openDownloadPage() {
    try {
      await invoke("open_release_page", { url: downloadPage.value });
      status.value = "idle";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      status.value = "error";
    }
  }

  async function restart() {
    try {
      await relaunch();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      status.value = "error";
    }
  }

  function dismiss() {
    reset();
  }

  return {
    status,
    mode,
    version,
    currentVersion,
    notes,
    progress,
    error,
    timedOut,
    downloadPage,
    checkForUpdate,
    downloadAndInstall,
    openDownloadPage,
    restart,
    dismiss,
  };
});
