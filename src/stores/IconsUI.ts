import { ref } from "vue";
import { defineStore } from "pinia";

export const useIconsUIStore = defineStore("iconsUI", () => {
  const showPalette = ref(false);
  const showLanguagePicker = ref(false);
  const isIconsHidden = ref(false);
  const manualIconOverride = ref(false);

  return { showPalette, showLanguagePicker, isIconsHidden, manualIconOverride };
});
