<template>
  <div class="focus-ring-container" :class="{ alarming: hasFinished }">
    <svg viewBox="0 0 200 200" class="focus-ring-svg">
      <circle cx="100" cy="100" r="85" fill="none" stroke="var(--ring-track)" stroke-width="14" />
      <circle
        cx="100"
        cy="100"
        r="85"
        fill="none"
        stroke="var(--ring-progress)"
        stroke-width="14"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90 100 100)"
        class="progress-arc"
      />
      <circle
        v-if="progress > 0 && progress < 1"
        :cx="ballX"
        :cy="ballY"
        r="9"
        fill="var(--ring-progress)"
        class="ball-indicator"
      />
    </svg>
    <button class="ring-center" @click.stop="$emit('click-center')">
      {{ formattedTime }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  progress: number;
  formattedTime: string;
  hasFinished: boolean;
}>();

defineEmits<{
  "click-center": [];
}>();

const R = 85;
const circumference = 2 * Math.PI * R;

const dashOffset = computed(() => {
  const p = Math.max(0, Math.min(1, props.progress));
  return circumference * (1 - p);
});

const angle = computed(() => props.progress * 2 * Math.PI);
const ballX = computed(() => 100 + R * Math.sin(angle.value));
const ballY = computed(() => 100 - R * Math.cos(angle.value));
</script>

<style scoped>
.focus-ring-container {
  position: relative;
  width: min(60vw, 60vh, 320px);
  height: min(60vw, 60vh, 320px);
  margin: 0 auto;
}

.focus-ring-svg {
  width: 100%;
  height: 100%;
}

.progress-arc {
  transition: stroke-dashoffset 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.ball-indicator {
  transition:
    cx 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    cy 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 0;
  font-family:
    "JetBrains Mono", "Cascadia Code", "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--app-text);
  cursor: pointer;
  outline: none;
  background: none;
  border: none;
  transform: translate(-50%, -50%);
}

.ring-center:hover {
  opacity: 0.75;
}

.focus-ring-container.alarming .focus-ring-svg {
  animation: alarm-pulse 1.2s ease-in-out infinite;
}

@keyframes alarm-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
  }
}
</style>
