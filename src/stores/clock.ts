import { ref, watch } from "vue";
import { defineStore } from "pinia";

const STORAGE_KEY = "flip-clock-format";

function readStorage(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return raw === "24";
  } catch {
    return null;
  }
}

export const useClockStore = defineStore("clock", () => {
  const stored = readStorage();
  const is24h = ref(stored ?? true);

  let initialized = false;

  watch(is24h, (val) => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, val ? "24" : "12");
    }
  });

  function toggle() {
    is24h.value = !is24h.value;
    initialized = true;
  }

  function init() {
    initialized = true;
  }

  return { is24h, toggle, init };
});
