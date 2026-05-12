<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useKeepAwake } from "@/utils/useKeepAwake";

useKeepAwake();
</script>
