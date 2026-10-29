export const LOCALE_STORAGE_KEY = "flip-clock-locale";
export const DEFAULT_LOCALE = "en-US";

export function matchLocale<T extends string>(
  candidate: string,
  available: readonly T[]
): T | null {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;

  const exact = available.find((code) => code.toLowerCase() === normalized);
  if (exact) return exact;

  const language = normalized.split("-")[0];
  return available.find((code) => code.toLowerCase().split("-")[0] === language) ?? null;
}

export function resolveLocale<T extends string>(
  candidates: readonly string[],
  available: readonly T[],
  fallback: string = DEFAULT_LOCALE
): T {
  for (const candidate of candidates) {
    const matched = matchLocale(candidate, available);
    if (matched) return matched;
  }
  const fallbackMatch = matchLocale(fallback, available);
  if (fallbackMatch) return fallbackMatch;
  return available[0] ?? (fallback as T);
}

export function readStoredLocale<T extends string>(available: readonly T[]): T | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored ? matchLocale(stored, available) : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(code: string): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Storage may be unavailable (private mode); language still applies for this session.
  }
}

function systemLocales(): string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages?.length) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
}

export function detectLocale<T extends string>(available: readonly T[]): T {
  const stored = readStoredLocale(available);
  return stored ?? resolveLocale(systemLocales(), available);
}
