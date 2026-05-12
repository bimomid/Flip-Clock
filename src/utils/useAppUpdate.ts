import { ref } from "vue";

export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; latestVersion: string; releaseUrl: string; assetUrl: string }
  | { status: "downloading"; downloaded: number; total: number }
  | { status: "ready"; installerPath: string; isPortable: boolean }
  | { status: "portable"; releaseUrl: string; portableUrl: string | null }
  | { status: "up-to-date" }
  | { status: "error"; message: string };

const state = ref<UpdateState>({ status: "idle" });
const isPortable = ref(false);

let unlistenProgress: (() => void) | null = null;

async function ensureTauri(): Promise<boolean> {
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    return isTauri();
  } catch {
    return false;
  }
}

export function useAppUpdate() {
  async function init() {
    if (!(await ensureTauri())) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      isPortable.value = await invoke<boolean>("is_portable");
    } catch {
      isPortable.value = false;
    }
  }

  async function checkForUpdates() {
    state.value = { status: "checking" };

    if (!(await ensureTauri())) {
      state.value = { status: "up-to-date" };
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");

      const info = await invoke<{
        latest_version: string;
        release_url: string;
        download_url: string;
        portable_url: string | null;
      } | null>("check_for_updates");

      if (!info) {
        state.value = { status: "up-to-date" };
        return;
      }

      if (isPortable.value) {
        state.value = {
          status: "portable",
          releaseUrl: info.release_url,
          portableUrl: info.portable_url,
        };
        return;
      }

      state.value = {
        status: "available",
        latestVersion: info.latest_version,
        releaseUrl: info.release_url,
        assetUrl: info.download_url,
      };
    } catch (e) {
      state.value = {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function startDownload(assetUrl: string, saveToDownloads: boolean) {
    state.value = { status: "downloading", downloaded: 0, total: 0 };

    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlistenProgress = await listen<{ downloaded: number; total: number }>(
        "update-download-progress",
        (event) => {
          const s = state.value;
          if (s.status === "downloading") {
            state.value = {
              ...s,
              downloaded: event.payload.downloaded,
              total: event.payload.total,
            };
          }
        }
      );
    } catch {
      // progress events are not critical
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const command = saveToDownloads ? "download_to_downloads" : "download_update";
      const path = await invoke<string>(command, { assetUrl });
      state.value = { status: "ready", installerPath: path, isPortable: saveToDownloads };
    } catch (e) {
      state.value = { status: "error", message: String(e) };
    } finally {
      unlistenProgress?.();
      unlistenProgress = null;
    }
  }

  async function install(installerPath: string) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("install_update", { installerPath });
    } catch (e) {
      state.value = { status: "error", message: String(e) };
    }
  }

  function openBrowser(url: string) {
    import("@tauri-apps/plugin-opener")
      .then(({ openUrl }) => openUrl(url))
      .catch(() => {
        window.open(url, "_blank");
      });
  }

  function reset() {
    state.value = { status: "idle" };
  }

  return { state, isPortable, init, checkForUpdates, startDownload, install, openBrowser, reset };
}
