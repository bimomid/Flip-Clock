<template>
  <main class="container">
    <FlipClock />
  </main>
</template>

<script setup lang="ts">
import FlipClock from "@/components/FlipClock.vue";
</script>

<style scoped>
.container {
  display: flex;
  min-height: 100vh;
}
</style>
