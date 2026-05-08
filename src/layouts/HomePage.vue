<template>
  <main class="home-page-contain">
    <IconsDock position="top-left" :drop-zones="['top-left']" />
    <IconsDock position="top-right" :drop-zones="['top-right']" />
    <IconsDock position="bottom-left" :drop-zones="['bottom-left']" />
    <IconsDock position="bottom-right" :drop-zones="['bottom-right']" />
    <IconsConfig />

    <FlipClock />
    <PanelPalette />
  </main>
</template>

<script setup lang="ts">
import FlipClock from "@/components/FlipClock.vue";
import IconsConfig from "@/components/IconsConfig.vue";
import IconsDock from "@/components/IconsDock.vue";
import PanelPalette from "@/components/PanelPalette.vue";
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
</style>
