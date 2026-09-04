<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { Passage, TestType } from "@/stores/memorization";
import BaseButton from "@/components/common/BaseButton.vue";
import DiffDisplay from "@/components/memorization/DiffDisplay.vue";

const props = defineProps<{
  passage: Passage;
  testType: TestType;
  index: number;
  total: number;
  isLast: boolean;
  blankInterval: number;
  result: {
    score: number | null;
    correctCount: number;
    wrongCount: number;
    missingCount: number;
    diffOrSnapshot: any;
  } | null;
}>();

const emit = defineEmits<{
  (e: "submit-recite"): void;
  (e: "submit-full-input", userInput: string): void;
  (e: "submit-fill-blank", blanks: string[], answers: string[]): void;
  (e: "next"): void;
}>();

const fullInputText = ref("");

// 빈칸 암송: 관리자가 설정한 간격(N단어마다 하나)으로 빈칸 처리
const words = computed(() => props.passage.content.split(/\s+/).filter(Boolean));
const blankIndices = computed(() => {
  const interval = Math.max(2, props.blankInterval || 3);
  return words.value.map((_, i) => i).filter((i) => (i + 1) % interval === 0);
});
const blankAnswers = reactive<Record<number, string>>({});

watch(
  () => props.passage.id,
  () => {
    fullInputText.value = "";
    Object.keys(blankAnswers).forEach((k) => delete blankAnswers[Number(k)]);
  }
);

function submitFillBlank() {
  const blanks = blankIndices.value.map((i) => words.value[i]);
  const answers = blankIndices.value.map((i) => blankAnswers[i] ?? "");
  emit("submit-fill-blank", blanks, answers);
}

// 빈칸 암송 결과: 문장 전체를 다시 보여주면서 틀리거나 빠뜨린 빈칸만 빨간색으로 표시한다.
function normalizeWord(s: string): string {
  return s
    .replace(/[.,!?"'"".．，。！？]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

const fillBlankReview = computed(() => {
  if (props.testType !== "fill_blank" || !props.result?.diffOrSnapshot) return null;
  const snapshot = props.result.diffOrSnapshot as { blanks: string[]; answers: string[] };
  let cursor = 0;
  return words.value.map((w, i) => {
    if (!blankIndices.value.includes(i)) {
      return { text: w, status: "plain" as const };
    }
    const expected = snapshot.blanks[cursor] ?? w;
    const answer = (snapshot.answers[cursor] ?? "").trim();
    cursor++;
    if (!answer) return { text: `[${expected}]`, status: "wrong" as const };
    if (normalizeWord(answer) === normalizeWord(expected)) {
      return { text: answer, status: "correct" as const };
    }
    return { text: `${answer}(${expected})`, status: "wrong" as const };
  });
});

const progressPercent = computed(() => Math.round(((props.index + 1) / props.total) * 100));
</script>

<template>
  <div class="test-runner">
    <div class="test-runner__progress">
      <span>{{ index + 1 }} / {{ total }}</span>
      <div class="test-runner__progress-bar">
        <div class="test-runner__progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>

    <h2 class="test-runner__ref">{{ passage.book }} {{ passage.chapterVerse }}</h2>

    <!-- 결과 표시 -->
    <div v-if="result" class="test-runner__result">
      <p v-if="result.score !== null" class="test-runner__score">{{ result.score }}점</p>
      <p v-if="result.score !== null" class="test-runner__breakdown">
        정답 {{ result.correctCount }} · 오답 {{ result.wrongCount }} · 누락 {{ result.missingCount }}
      </p>
      <DiffDisplay v-if="testType === 'full_input' && result.diffOrSnapshot?.diff" :diff="result.diffOrSnapshot.diff" />
      <p v-else-if="testType === 'fill_blank' && fillBlankReview" class="test-runner__blank-review">
        <template v-for="(item, idx) in fillBlankReview" :key="idx">
          <span :class="{ 'test-runner__word--wrong': item.status === 'wrong' }">{{ item.text }}</span>
          {{ " " }}
        </template>
      </p>
      <BaseButton style="width: 100%; margin-top: 16px" @click="emit('next')">
        {{ isLast ? "결과 확인" : "다음 구절" }}
      </BaseButton>
    </div>

    <!-- 전체 암송 -->
    <template v-else-if="testType === 'full_recite'">
      <p class="test-runner__passage">{{ passage.content }}</p>
      <BaseButton style="width: 100%" @click="emit('submit-recite')">암송 완료</BaseButton>
    </template>

    <!-- 전체 입력 -->
    <template v-else-if="testType === 'full_input'">
      <textarea
        v-model="fullInputText"
        class="test-runner__textarea"
        placeholder="여기에 암송 내용을 입력하세요"
        rows="6"
      />
      <BaseButton style="width: 100%" @click="emit('submit-full-input', fullInputText)">채점하기</BaseButton>
    </template>

    <!-- 빈칸 암송 -->
    <template v-else>
      <p class="test-runner__blank-text">
        <template v-for="(w, i) in words" :key="i">
          <input
            v-if="blankIndices.includes(i)"
            v-model="blankAnswers[i]"
            class="test-runner__blank-input"
            :aria-label="`빈칸 ${i + 1}`"
          />
          <span v-else>{{ w }}</span>
          {{ " " }}
        </template>
      </p>
      <BaseButton style="width: 100%" @click="submitFillBlank">채점하기</BaseButton>
    </template>
  </div>
</template>

<style scoped>
.test-runner__progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}
.test-runner__progress-bar {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.test-runner__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--easing-standard);
}
.test-runner__ref {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
}
.test-runner__passage,
.test-runner__blank-text {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  margin: 0 0 var(--space-6);
}
.test-runner__blank-input {
  display: inline-block;
  min-width: 64px;
  border: none;
  border-bottom: 2px solid var(--color-primary);
  background: transparent;
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  text-align: center;
  padding: 0 var(--space-1);
}
.test-runner__textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-4);
  resize: vertical;
}
.test-runner__result {
  padding: var(--space-4) 0;
}
.test-runner__blank-review {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
}
.test-runner__word--wrong {
  color: var(--color-danger);
}
.test-runner__score {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin: 0;
}
.test-runner__breakdown {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: var(--space-1) 0 var(--space-4);
}
</style>
