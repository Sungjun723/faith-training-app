<script setup lang="ts">
import type { WeeklySummary, WeeklyFlagKey } from "@/stores/weekly";
import BaseCheckbox from "@/components/common/BaseCheckbox.vue";

const props = defineProps<{ weekly: WeeklySummary["weekly"] }>();
const emit = defineEmits<{ (e: "toggle", key: WeeklyFlagKey, value: boolean): void }>();

const items: { key: WeeklyFlagKey; label: string }[] = [
  { key: "inductiveStudyCompleted", label: "한 주 귀납" },
  { key: "bookReadingCompleted", label: "독서" },
  { key: "previewCompleted", label: "예습" },
  { key: "sundayServiceCompleted", label: "주일 예배" },
  { key: "fridayServiceCompleted", label: "청금" },
  { key: "smallGroupCompleted", label: "순모임" },
  { key: "memorizationCompleted", label: "암송" },
];
</script>

<template>
  <div class="weekly-checklist">
    <div v-for="item in items" :key="item.key" class="weekly-checklist__row">
      <BaseCheckbox
        :model-value="weekly[item.key]"
        :label="item.label"
        @update:model-value="(v) => emit('toggle', item.key, v)"
      />
    </div>
  </div>
</template>

<style scoped>
.weekly-checklist__row {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
.weekly-checklist__row:last-child {
  border-bottom: none;
}
</style>
