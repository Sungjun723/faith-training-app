<script setup lang="ts">
import type { DiffItem } from "@/stores/memorization";
defineProps<{ diff: DiffItem[] }>();
</script>

<template>
  <p class="diff-display">
    <template v-for="(item, idx) in diff" :key="idx">
      <span v-if="item.type === 'correct'" class="diff-display__word">{{ item.text }}</span>
      <span v-else-if="item.type === 'wrong'" class="diff-display__word diff-display__word--wrong">
        {{ item.actual }}<small>({{ item.expected }})</small>
      </span>
      <span v-else class="diff-display__word diff-display__word--wrong">[{{ item.expected }}]</span>
      {{ " " }}
    </template>
  </p>
</template>

<style scoped>
.diff-display {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
}
.diff-display__word--wrong {
  color: var(--color-danger);
}
.diff-display__word--wrong small {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
