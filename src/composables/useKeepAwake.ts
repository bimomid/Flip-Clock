import { onMounted, onBeforeUnmount } from "vue";
import { preventSleep } from "@/services/platform";

let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {}
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {}
  wakeLock = null;
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    void requestWakeLock();
  }
}

function onFocus() {
  void requestWakeLock();
}

export function useKeepAwake() {
  onMounted(() => {
    void requestWakeLock();
    void preventSleep();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
  });

  onBeforeUnmount(() => {
    void releaseWakeLock();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
  });
}
