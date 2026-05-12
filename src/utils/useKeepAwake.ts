import { onMounted, onBeforeUnmount } from "vue";
import { isTauri } from "@tauri-apps/api/core";

type Platform = "mobile" | "desktop";

function detectPlatform(): Platform {
  return /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

export function useKeepAwake() {
  const platform = detectPlatform();
  let wakeLock: WakeLockSentinel | null = null;
  const unlistenFns: (() => void)[] = [];

  async function acquire() {
    if (!("wakeLock" in navigator)) return;
    if (wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch {
      // WakeLock not supported or permission denied — degrade gracefully
    }
  }

  async function release() {
    if (!wakeLock) return;
    try {
      await wakeLock.release();
    } catch {
      // already released
    }
    wakeLock = null;
  }

  // visibilitychange: re-acquire when page becomes visible again
  async function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      if (platform === "mobile") {
        await acquire();
      }
    } else {
      // WakeLock auto-releases when page is hidden
      wakeLock = null;
    }
  }

  onMounted(async () => {
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (platform === "mobile") {
      await acquire();
      return;
    }

    if (!isTauri()) return;

    // Desktop Tauri: conditional on maximized + focused
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();

    let maximized = await win.isMaximized();
    let focused = await win.isFocused();

    if (maximized && focused) await acquire();

    const u1 = await win.onResized(async () => {
      maximized = await win.isMaximized();
      if (maximized && focused) await acquire();
      else await release();
    });

    const u2 = await win.onFocusChanged(({ payload }: { payload: boolean }) => {
      focused = payload;
      if (maximized && focused) acquire();
      else release();
    });

    unlistenFns.push(u1, u2);
  });

  onBeforeUnmount(() => {
    release();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    unlistenFns.forEach((fn) => fn());
  });
}
