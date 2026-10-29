export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatClockTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function formatLapTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const c = Math.floor((ms % 1000) / 10);
  if (h > 0) {
    return `${h}:${pad2(m)}:${pad2(s)}.${pad2(c)}`;
  }
  return `${pad2(m)}:${pad2(s)}.${pad2(c)}`;
}

export function formatSplitTime(splitMs: number): string {
  const sign = splitMs >= 0 ? "+" : "-";
  const absMs = Math.abs(splitMs);
  const m = Math.floor(absMs / 60000);
  const s = Math.floor((absMs % 60000) / 1000);
  const c = Math.floor((absMs % 1000) / 10);
  if (m > 0) {
    return `${sign}${m}:${pad2(s)}.${pad2(c)}`;
  }
  return `${sign}${s}.${pad2(c)}`;
}
