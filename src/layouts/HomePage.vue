<template>
  <main class="home-page-contain">
    <DockRow row="top" />
    <DockRow row="bottom" />
    <IconsConfig />

    <Transition
      name="clock-switch"
      mode="out-in"
      @before-leave="lockToggle"
      @after-enter="unlockToggle"
    >
      <FlipClock v-if="!focusStore.isVisible" key="clock" />
      <FocusMode v-else key="focus" />
    </Transition>
    <PanelPalette />
  </main>
</template>

<script setup lang="ts">
import FlipClock from "@/components/FlipClock.vue";
import FocusMode from "@/components/FocusMode.vue";
import IconsConfig from "@/components/IconsConfig.vue";
import DockRow from "@/components/DockRow.vue";
import PanelPalette from "@/components/PanelPalette.vue";
import { useFocusTimerStore } from "@/stores/FocusTimer";

const focusStore = useFocusTimerStore();

function lockToggle() {
  focusStore.lockToggle();
}
function unlockToggle() {
  focusStore.unlockToggle();
}
</script>

<style scoped>
.home-page-contain {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  padding: 24px;
}

.clock-switch-enter-active,
.clock-switch-leave-active {
  transition:
    opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.clock-switch-enter-from {
  opacity: 0;
  transform: scale(0.94);
}

.clock-switch-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
