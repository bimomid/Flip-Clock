import { createI18n } from "vue-i18n";
import zhCN from "./packages/zh-CN.json";
import enUS from "./packages/en-US.json";

export interface LocaleEntry {
  code: string;
  name: string;
}

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export const availableLocales: LocaleEntry[] = Object.entries(messages).map(([code, msgs]) => ({
  code,
  name: (msgs as { locale: { name: string } }).locale.name,
}));

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages,
});

export default i18n;
