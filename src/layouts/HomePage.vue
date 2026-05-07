<template>
  <main class="home-page-contain">
    <ToolbarDock position="top-left" :drop-zones="['top-left']" />
    <ToolbarDock position="top-right" :drop-zones="['top-right']" />
    <ToolbarDock position="bottom-left" :drop-zones="['bottom-left']" />
    <ToolbarDock position="bottom-right" :drop-zones="['bottom-right']" />

    <FlipClock />
    <ColorPalette :visible="showPalette" @close="showPalette = false" />

    <!-- 拖拽幽灵元素 -->
    <Teleport to="body">
      <div
        v-if="drag.active"
        class="drag-ghost"
        :style="{ left: drag.x + 'px', top: drag.y + 'px', color: ghostColor }"
      >
        <span v-html="drag.svg"></span>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import FlipClock from "@/components/FlipClock.vue";
import ToolbarDock, { drag } from "@/components/ToolbarDock.vue";
import ColorPalette from "@/components/ColorPalette.vue";
import { useDockStore } from "@/stores/dock";
import { useIconRegistry } from "@/composables/useIconRegistry";

const dockStore = useDockStore();
const { showPalette, resolve } = useIconRegistry();

const ghostColor = computed(() => {
  if (!drag.active || !drag.iconId) return "var(--dock-item-color)";
  return resolve(drag.iconId)?.color ?? "var(--dock-item-color)";
});

onMounted(() => {
  dockStore.initLayout();
});
</script>

<style scoped>
:global(:root) {
  --theme-icon-dark: #1077de;
  --theme-icon-light: #f59e0b;
  --theme-icon-palette: #f4359e;
  --theme-icon-time-12: #10b981;
  --theme-icon-time-24: #8b5cf6;
  --theme-icon-settings: #ff1827;
}

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

/* 拖拽幽灵 — 跟随鼠标的半透明图标 */
.drag-ghost {
  position: fixed;
  z-index: 9999;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  pointer-events: none;
  background: var(--dock-item-bg);
  border: 1.5px solid var(--dock-item-border-hover);
  border-radius: 50%;
  box-shadow: 0 4px 20px hsl(0deg 0% 0% / 18%);
  opacity: 0.92;
  transform: translate(-50%, -50%);
}

.drag-ghost :deep(svg) {
  display: block;
  width: 18px;
  height: 18px;
}
</style>
