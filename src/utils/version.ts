export interface ParsedVersion {
  numbers: number[];
  prerelease: string;
}

export function parseVersion(input: string): ParsedVersion | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/^v/i, "").split("+")[0];
  if (!trimmed) return null;
  const dash = trimmed.indexOf("-");
  const core = dash === -1 ? trimmed : trimmed.slice(0, dash);
  const prerelease = dash === -1 ? "" : trimmed.slice(dash + 1);
  const numbers = core.split(".").map((part) => Number(part));
  if (numbers.length === 0 || numbers.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return { numbers, prerelease };
}

/** candidate 是否比 current 新（语义化版本比较，缺位按 0 处理，预发布小于正式版）。 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const next = parseVersion(candidate);
  const now = parseVersion(current);
  if (!next || !now) return false;

  const length = Math.max(next.numbers.length, now.numbers.length);
  for (let i = 0; i < length; i += 1) {
    const a = next.numbers[i] ?? 0;
    const b = now.numbers[i] ?? 0;
    if (a !== b) return a > b;
  }

  if (next.prerelease === now.prerelease) return false;
  if (!next.prerelease) return true;
  if (!now.prerelease) return false;
  return next.prerelease.localeCompare(now.prerelease, "en") > 0;
}
