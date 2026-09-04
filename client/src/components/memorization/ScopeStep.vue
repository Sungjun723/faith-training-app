<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

// computed로 파생시켜 초기 selected 세팅과 무관하게 항상 최신 상태를 반영한다.
// (이전에는 watch(selected, ...)로 별도 계산했는데, 최초 immediate 세팅 시점에는
//  그 watcher가 아직 등록되지 않아 기본 선택값의 구절 수가 채워지지 않고
//  "테스트 시작" 버튼이 계속 비활성화 상태로 남는 문제가 있었다.)
const selectedOption = computed<MemorizationWeekOption | null>(
  () => props.weekOptions.find((w) => w.id === selected.value) ?? null
);
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
