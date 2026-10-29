export async function preventSleep(): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("prevent_sleep");
  } catch {}
}

/** 是否运行在 Android 应用内（Tauri updater 不支持移动端，需要走手动下载流程）。 */
export function isAndroidPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
