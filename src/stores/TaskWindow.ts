import { ref } from "vue";
import { defineStore } from "pinia";

export const useTaskStore = defineStore(
  "taskWindow",
  () => {
    const isVisible = ref(false);
    const x = ref(200);
    const y = ref(140);
    const width = ref(340);
    const height = ref(320);
    const content = ref("");

    function toggleVisibility() {
      isVisible.value = !isVisible.value;
    }

    return {
      isVisible,
      x,
      y,
      width,
      height,
      content,
      toggleVisibility,
    };
  },
  {
    persist: {
      key: "flip-clock-tasks-v1",
      pick: ["x", "y", "width", "height", "content"],
    },
  }
);
