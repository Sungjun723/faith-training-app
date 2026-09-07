<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { MemorizationWeekOption, ScopeType } from "@/stores/memorization";
import BaseButton from "@/components/common/BaseButton.vue";

const props = defineProps<{ weekOptions: MemorizationWeekOption[]; currentWeekNumber: number | null }>();
const emit = defineEmits<{ (e: "confirm", scopeWeekNumber: number, scopeType: ScopeType): void }>();

const selected = ref<number | null>(null);
watch(
  () => props.currentWeekNumber,
  (v) => {
    if (v && selected.value === null) selected.value = v;
  },
  { immediate: true }
);

// computed로 파생시켜 초기 selected 세팅과 무관하게 항상 최신 상태를 반영한다.
const selectedOption = computed<MemorizationWeekOption | null>(
  () => props.weekOptions.find((w) => w.weekNumber === selected.value) ?? null
);

const scopeType = ref<ScopeType>("cumulative");
// 주차를 바꾸면 범위 종류는 누적으로 되돌린다 (매번 명시적으로 고르게 하지 않기 위한 기본값).
watch(selected, () => {
  scopeType.value = "cumulative";
});

const selectedCount = computed(() =>
  scopeType.value === "single" ? selectedOption.value?.weekPassageCount ?? 0 : selectedOption.value?.cumulativePassageCount ?? 0
);
</script>

<template>
  <div class="scope-step">
    <h2 class="scope-step__title">암송 테스트</h2>
    <p class="scope-step__current" v-if="currentWeekNumber">현재 {{ currentWeekNumber }}주차</p>

    <p class="scope-step__label">주차 선택</p>
    <div class="scope-step__options">
      <label
        v-for="option in weekOptions"
        :key="option.weekNumber"
        class="scope-step__option"
        :class="{ 'is-selected': selected === option.weekNumber }"
      >
        <input type="radio" name="scope" :value="option.weekNumber" v-model="selected" />
        <span>{{ option.weekNumber }}주차</span>
      </label>
    </div>

    <template v-if="selectedOption">
      <p class="scope-step__label">범위 선택</p>
      <div class="scope-step__options">
        <label
          class="scope-step__option"
          :class="{ 'is-selected': scopeType === 'single' }"
        >
          <input type="radio" name="scope-type" value="single" v-model="scopeType" />
          <span>{{ selectedOption.weekNumber }}주차 테스트만 보기 ({{ selectedOption.weekPassageCount }}개)</span>
        </label>
        <label
          class="scope-step__option"
          :class="{ 'is-selected': scopeType === 'cumulative' }"
        >
          <input type="radio" name="scope-type" value="cumulative" v-model="scopeType" />
          <span>{{ selectedOption.weekNumber }}주차 누적 테스트 보기 ({{ selectedOption.cumulativePassageCount }}개)</span>
        </label>
      </div>

      <p class="scope-step__count">
        현재 테스트 구절 총 <strong>{{ selectedCount }}개</strong>
      </p>
    </template>

    <BaseButton
      :disabled="!selected || selectedCount === 0"
      style="width: 100%"
      @click="selected && emit('confirm', selected, scopeType)"
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
.scope-step__label {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
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
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  min-height: var(--touch-target-min);
  transition: box-shadow var(--duration-fast) var(--easing-standard);
}
.scope-step__option.is-selected {
  box-shadow: 0 0 0 2px var(--color-primary);
  background: var(--color-primary-light);
}
.scope-step__count {
  margin: 0 0 var(--space-5);
  font-weight: var(--font-weight-medium);
}
</style>
