import { ref } from "vue";
import { defineStore } from "pinia";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export const useUpdaterStore = defineStore("updater", () => {
  const status = ref<UpdateStatus>("idle");
  const version = ref("");
  const notes = ref("");
  const progress = ref(0);
  const error = ref("");
  const currentVersion = ref("");

  let pending: Update | null = null;

  function reset() {
    status.value = "idle";
    version.value = "";
    notes.value = "";
    progress.value = 0;
    error.value = "";
    const closing = pending;
    pending = null;
    if (closing) void closing.close().catch(() => {});
  }

  async function checkForUpdate() {
    if (status.value === "checking" || status.value === "downloading") return;

    status.value = "checking";
    error.value = "";

    try {
      currentVersion.value = await getVersion();
      const update = await check();
      if (!update) {
        status.value = "up-to-date";
        return;
      }
      pending = update;
      version.value = update.version;
      notes.value = update.body ?? "";
      status.value = "available";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
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
    version,
    currentVersion,
    notes,
    progress,
    error,
    checkForUpdate,
    downloadAndInstall,
    restart,
    dismiss,
  };
});
