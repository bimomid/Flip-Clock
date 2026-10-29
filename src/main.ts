import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "@/App.vue";
import i18n from "@/languages";
import { useThemeModeStore } from "@/stores/ThemeMode";
import { useKeepPaletteStore } from "@/stores/KeepPalette";
import "@/styles/fonts.css";
import "@/styles/theme.scss";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App).use(pinia).use(i18n);

// Apply the persisted theme and palette before the first paint, otherwise dark-theme users
// see a light-coloured flash on every launch.
useThemeModeStore().initTheme();
useKeepPaletteStore().init();

app.mount("#app");
