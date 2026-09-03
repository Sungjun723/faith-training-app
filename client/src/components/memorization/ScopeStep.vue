<script setup lang="ts">
import { ref, watch } from "vue";
import type { MemorizationWeekOption } from "@/stores/memorization";
import BaseButton from "@/components/common/BaseButton.vue";

const props = defineProps<{ weekOptions: MemorizationWeekOption[]; currentWeekId: number | null }>();
const emit = defineEmits<{ (e: "confirm", scopeWeekId: number): void }>();

const selected = ref<number | null>(null);
watch(
  () => props.currentWeekId,
  (v) => {
    if (v && selected.value === null) selected.value = v;
  },
  { immediate: true }
);

const selectedOption = ref<MemorizationWeekOption | null>(null);
watch(selected, (id) => {
  selectedOption.value = props.weekOptions.find((w) => w.id === id) ?? null;
});
</script>

<template>
  <div class="scope-step">
    <h2 class="scope-step__title">암송 테스트</h2>
    <p class="scope-step__current" v-if="currentWeekId">
      현재 {{ weekOptions.find((w) => w.id === currentWeekId)?.weekNumber }}주차
    </p>

    <div class="scope-step__options">
      <label
        v-for="option in weekOptions"
        :key="option.id"
        class="scope-step__option"
        :class="{ 'is-selected': selected === option.id }"
      >
        <input type="radio" name="scope" :value="option.id" v-model="selected" />
        <span>
          {{ option.weekNumber }}주차{{ option.id === currentWeekId ? "까지 누적" : "" }}
        </span>
      </label>
    </div>

    <p v-if="selectedOption" class="scope-step__count">
      현재 테스트 구절 총 <strong>{{ selectedOption.cumulativePassageCount }}개</strong>
    </p>

    <BaseButton
      :disabled="!selected || (selectedOption?.cumulativePassageCount ?? 0) === 0"
      style="width: 100%"
      @click="selected && emit('confirm', selected)"
    >
      테스트 시작
    </BaseButton>
  </div>
</template>

<style scoped>
.scope-step__title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-xl);
}
.scope-step__current {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--space-5);
}
.scope-step__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.scope-step__option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  min-height: var(--touch-target-min);
}
.scope-step__option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.scope-step__count {
  margin: 0 0 var(--space-5);
  font-weight: var(--font-weight-medium);
}
</style>
