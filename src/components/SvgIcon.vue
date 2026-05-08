<template>
  <span ref="el"></span>
</template>

<script setup lang="ts">
import {
  useTemplateRef,
  toValue,
  watch,
  onMounted,
  type MaybeRefOrGetter,
  type WatchSource,
  type MaybeRef,
} from "vue";

export interface IconConfig {
  svg: MaybeRefOrGetter<string>;
  svgWatch?: WatchSource;
  color: MaybeRef<string>;
  onClick?: (e: MouseEvent) => void;
}

const props = defineProps<{ config: IconConfig }>();

const el = useTemplateRef("el");

function update() {
  if (el.value) el.value.innerHTML = toValue(props.config.svg);
}

onMounted(() => {
  update();
  if (props.config.svgWatch) watch(props.config.svgWatch, update);
});
</script>
