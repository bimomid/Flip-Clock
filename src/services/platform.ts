export async function preventSleep(): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("prevent_sleep");
  } catch {}
}
