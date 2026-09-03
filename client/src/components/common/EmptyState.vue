<script setup lang="ts">
withDefaults(defineProps<{ message?: string; icon?: string }>(), {
  message: "표시할 내용이 없습니다.",
  icon: "📭",
});
</script>

<template>
  <div class="empty-state">
    <span class="empty-state__icon" aria-hidden="true">{{ icon }}</span>
    <p class="empty-state__text">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
}
.empty-state__icon {
  font-size: 32px;
}
.empty-state__text {
  margin: 0;
  font-size: var(--font-size-sm);
  white-space: pre-line;
}
</style>
