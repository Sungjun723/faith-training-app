<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), {
  message: "데이터를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.",
});
defineEmits<{ (e: "retry"): void }>();
</script>

<template>
  <div class="error-state" role="alert">
    <p class="error-state__text">{{ message }}</p>
    <button type="button" class="error-state__retry" @click="$emit('retry')">다시 시도</button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}
.error-state__text {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  white-space: pre-line;
  margin: 0;
}
.error-state__retry {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
</style>
