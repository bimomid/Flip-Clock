import { defineStore } from "pinia";
import { ref } from "vue";

export const useSoundToggleStore = defineStore(
  "soundToggle",
  () => {
    const isSoundOn = ref(true);

    function toggle() {
      isSoundOn.value = !isSoundOn.value;
    }

    return { isSoundOn, toggle };
  },
  {
    persist: { key: "soundToggle", pick: ["isSoundOn"] },
  }
);
