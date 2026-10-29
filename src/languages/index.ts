import { createI18n } from "vue-i18n";
import zhCN from "./packages/zh-CN.json";
import enUS from "./packages/en-US.json";
import { detectLocale, matchLocale, writeStoredLocale } from "./locale";

export interface LocaleEntry {
  code: string;
  name: string;
}

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

const availableCodes = Object.keys(messages) as (keyof typeof messages)[];

export const availableLocales: LocaleEntry[] = availableCodes.map((code) => ({
  code,
  name: messages[code].locale.name,
}));

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(availableCodes),
  fallbackLocale: "zh-CN",
  messages,
});

function applyDocumentLanguage(code: string) {
  if (typeof document !== "undefined") document.documentElement.lang = code;
}

export function setLocale(code: string): void {
  const next = matchLocale(code, availableCodes);
  if (!next) return;
  i18n.global.locale.value = next;
  writeStoredLocale(next);
  applyDocumentLanguage(next);
}

applyDocumentLanguage(i18n.global.locale.value);

export default i18n;
