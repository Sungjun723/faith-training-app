<script setup lang="ts">
import Icon from "@/components/common/Icon.vue";

withDefaults(defineProps<{ message?: string; icon?: string }>(), {
  message: "표시할 내용이 없습니다.",
  icon: "document",
});
</script>

<template>
  <div class="empty-state">
    <Icon :name="icon" :size="32" class="empty-state__icon" />
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
  color: var(--color-text-muted);
}
.empty-state__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: pre-line;
}
</style>
