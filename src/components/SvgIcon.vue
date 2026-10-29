<template>
  <span ref="el"></span>
</template>

<script setup lang="ts">
import { useTemplateRef, toValue, watch, onMounted, onBeforeUnmount } from "vue";
import type { IconConfig } from "@/config/icons";

const props = defineProps<{ config: IconConfig | undefined }>();

const el = useTemplateRef("el");

function update() {
  if (!el.value || !props.config) return;
  el.value.innerHTML = toValue(props.config.svg);
}

let stopWatch: (() => void) | undefined;

onMounted(() => {
  update();
  if (props.config.svgWatch) stopWatch = watch(props.config.svgWatch, update);
});

onBeforeUnmount(() => {
  stopWatch?.();
});
</script>
