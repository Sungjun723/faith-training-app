<script setup lang="ts">
import type { TestType } from "@/stores/memorization";

defineEmits<{ (e: "select", type: TestType): void }>();

const options: { type: TestType; title: string; desc: string }[] = [
  { type: "full_recite", title: "전체 암송", desc: "성경 구절 전체 보기" },
  { type: "fill_blank", title: "빈칸 암송", desc: "일부 단어가 빈칸" },
  { type: "full_input", title: "전체 입력", desc: "구절 전체를 입력" },
];
</script>

<template>
  <div class="type-step">
    <h2 class="type-step__title">테스트 방식을 선택하세요</h2>
    <div class="type-step__grid">
      <button
        v-for="opt in options"
        :key="opt.type"
        type="button"
        class="type-step__card"
        @click="$emit('select', opt.type)"
      >
        <span class="type-step__card-title">{{ opt.title }}</span>
        <span class="type-step__card-desc">{{ opt.desc }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.type-step__title {
  margin: 0 0 var(--space-5);
  font-size: var(--font-size-lg);
}
.type-step__grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.type-step__card {
  text-align: left;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  transition: border-color var(--duration-fast) var(--easing-standard), transform var(--duration-fast) var(--easing-standard);
}
.type-step__card:active {
  transform: scale(0.98);
}
.type-step__card:hover {
  border-color: var(--color-primary);
}
.type-step__card-title {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
}
.type-step__card-desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
