import { onMounted, onBeforeUnmount } from "vue";

const HEARTBEAT_MS = 5000;

let wakeLock: WakeLockSentinel | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    // wake lock unavailable (low battery, permissions, etc.)
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // already released
  }
  wakeLock = null;
}

async function callRustPreventSleep() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("prevent_sleep");
  } catch {
    // not running in Tauri (e.g., dev in browser) — Wake Lock API suffices
  }
}

function simulateActivity() {
  const target = document.body;
  const x = Math.random() * 2;
  const y = Math.random() * 2;

  target.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    })
  );

  target.dispatchEvent(
    new TouchEvent("touchstart", {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: Date.now(),
          target,
          clientX: x,
          clientY: y,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 0.1,
        }),
      ],
    })
  );
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(simulateActivity, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    requestWakeLock();
  }
}

function onFocus() {
  requestWakeLock();
}

export function useKeepAwake() {
  onMounted(() => {
    requestWakeLock();
    callRustPreventSleep();
    startHeartbeat();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
  });

  onBeforeUnmount(() => {
    releaseWakeLock();
    stopHeartbeat();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
  });
}
