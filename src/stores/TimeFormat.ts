import { ref } from "vue";
import { defineStore } from "pinia";

export const useTimeFormatStore = defineStore(
  "timeFormat",
  () => {
    const is24h = ref(true);

    function toggle() {
      is24h.value = !is24h.value;
    }

    return { is24h, toggle };
  },
  {
    persist: {
      key: "flip-clock-format",
      pick: ["is24h"],
    },
  }
);
