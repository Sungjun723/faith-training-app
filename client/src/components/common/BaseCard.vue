<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true });
</script>

<template>
  <div class="base-card" :class="{ 'base-card--padded': padded }">
    <slot />
  </div>
</template>

<style scoped>
.base-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.base-card--padded {
  padding: var(--space-5);
}
</style>
