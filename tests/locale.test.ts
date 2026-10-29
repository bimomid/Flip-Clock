import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectLocale,
  matchLocale,
  readStoredLocale,
  resolveLocale,
  writeStoredLocale,
} from "@/languages/locale";

const available = ["zh-CN", "en-US"];

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("matchLocale", () => {
  it("matches an exact code case-insensitively", () => {
    expect(matchLocale("EN-us", available)).toBe("en-US");
  });

  it("falls back to the same language for regional variants", () => {
    expect(matchLocale("zh-TW", available)).toBe("zh-CN");
  });

  it("returns null for unknown or empty input", () => {
    expect(matchLocale("ja-JP", available)).toBeNull();
    expect(matchLocale("   ", available)).toBeNull();
  });
});

describe("resolveLocale", () => {
  it("returns the first candidate that matches", () => {
    expect(resolveLocale(["ja-JP", "zh-HK", "en-US"], available)).toBe("zh-CN");
  });

  it("uses the default locale when nothing matches", () => {
    expect(resolveLocale(["ja-JP", "ko-KR"], available)).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the first available locale when the default is missing", () => {
    expect(resolveLocale(["ja-JP"], ["fr-FR"])).toBe("fr-FR");
  });
});

describe("stored locale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes and reads a supported locale", () => {
    vi.stubGlobal("localStorage", createStorage());

    writeStoredLocale("en-US");

    expect(readStoredLocale(available)).toBe("en-US");
  });

  it("ignores a stored locale that is no longer supported", () => {
    vi.stubGlobal("localStorage", createStorage({ [LOCALE_STORAGE_KEY]: "ja-JP" }));

    expect(readStoredLocale(available)).toBeNull();
  });

  it("survives unavailable storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });

    expect(readStoredLocale(available)).toBeNull();
    expect(() => writeStoredLocale("en-US")).not.toThrow();
  });
});

describe("detectLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers the stored choice over the system language", () => {
    vi.stubGlobal("localStorage", createStorage({ [LOCALE_STORAGE_KEY]: "zh-CN" }));
    vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });

    expect(detectLocale(available)).toBe("zh-CN");
  });

  it("follows the system language on first launch", () => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("navigator", { languages: ["en-GB"] });

    expect(detectLocale(available)).toBe("en-US");
  });

  it("uses navigator.language when navigator.languages is empty", () => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("navigator", { languages: [], language: "zh-TW" });

    expect(detectLocale(available)).toBe("zh-CN");
  });

  it("falls back to the default locale for unsupported system languages", () => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("navigator", { languages: ["ja-JP"] });

    expect(detectLocale(available)).toBe(DEFAULT_LOCALE);
  });
});
