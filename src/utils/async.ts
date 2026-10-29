/** 超时错误单独一类，界面据此显示“网络太慢/被墙”的友好文案。 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * 给任意 Promise 加一个兜底超时。
 * 原生侧（Rust / Tauri 插件）若卡在无响应的网络请求上，界面不能跟着一起转圈。
 */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
