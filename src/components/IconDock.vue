<template>
  <div class="icon-dock" role="toolbar" aria-label="Icon dock">
    <button
      v-for="icon in icons"
      :key="icon.id"
      class="icon-dock-item"
      type="button"
      :aria-label="icon.id"
      :title="icon.id"
      :style="icon.color ? { color: icon.color } : undefined"
      @click="icon.onClick?.($event)"
    >
      <span class="icon-dock-icon" v-html="icon.svg"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
type IconDockItem = {
  id: string;
  svg: string;
  color?: string;
  onClick?: (event: MouseEvent) => void;
};

defineProps<{ icons: IconDockItem[] }>();
</script>

<style scoped>
.icon-dock {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 999px;
}

.icon-dock-item {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--dock-item-color);
  background: var(--dock-item-bg);
  border: 1px solid var(--dock-item-border);
  border-radius: 999px;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.icon-dock-item:hover {
  color: var(--dock-item-color-hover);
  border-color: var(--dock-item-border-hover);
  transform: translateY(-1px);
}

.icon-dock-icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
}

.icon-dock-icon :deep(svg) {
  display: block;
  width: 18px;
  height: 18px;
}
</style>
