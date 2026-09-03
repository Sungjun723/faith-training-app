<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useMemorizationStore, type TestType } from "@/stores/memorization";
import { useToast } from "@/composables/useToast";
import ScopeStep from "@/components/memorization/ScopeStep.vue";
import TypeStep from "@/components/memorization/TypeStep.vue";
import TestRunner from "@/components/memorization/TestRunner.vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

type Step = "scope" | "type" | "test" | "final";

const store = useMemorizationStore();
const toast = useToast();
const router = useRouter();

const step = ref<Step>("scope");
const loading = ref(true);
const loadError = ref(false);
const scopeWeekId = ref<number | null>(null);
const finalSummary = ref<{
  totalPassages: number;
  averageScore: number | null;
  correctPassages: number;
  needsReviewPassages: number;
} | null>(null);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    await store.fetchWeekOptions();
    await store.fetchSettings();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function handleScopeConfirm(weekId: number) {
  scopeWeekId.value = weekId;
  step.value = "type";
}

async function handleTypeSelect(testType: TestType) {
  if (!scopeWeekId.value) return;
  try {
    await store.startSession(scopeWeekId.value, testType);
    step.value = "test";
  } catch (err: any) {
    toast.error(err?.message ?? "테스트를 시작하지 못했습니다.");
  }
}

async function handleSubmitRecite() {
  try {
    await store.submitResult({});
  } catch {
    toast.error("처리하지 못했습니다. 다시 시도해주세요.");
  }
}

async function handleSubmitFullInput(userInput: string) {
  try {
    await store.submitResult({ userInput });
  } catch {
    toast.error("채점하지 못했습니다. 다시 시도해주세요.");
  }
}

async function handleSubmitFillBlank(blanks: string[], answers: string[]) {
  try {
    await store.submitResult({ blanks, answers });
  } catch {
    toast.error("채점하지 못했습니다. 다시 시도해주세요.");
  }
}

async function handleNext() {
  if (store.isLastPassage) {
    const summary = await store.completeSession();
    finalSummary.value = summary;
    step.value = "final";
  } else {
    store.nextPassage();
  }
}

function restart() {
  step.value = "scope";
  scopeWeekId.value = null;
  finalSummary.value = null;
}

function goDashboard() {
  router.push({ name: "dashboard" });
}
</script>

<template>
  <div class="memorization-page" v-if="!loading && !loadError">
    <BaseCard v-if="store.weekOptions.length === 0">
      <EmptyState message="아직 등록된 암송 구절이 없습니다.\n관리자에게 문의해주세요." icon="📖" />
    </BaseCard>
    <BaseCard v-else>
      <ScopeStep
        v-if="step === 'scope'"
        :week-options="store.weekOptions"
        :current-week-id="store.currentWeekId"
        @confirm="handleScopeConfirm"
      />

      <TypeStep v-else-if="step === 'type'" @select="handleTypeSelect" />

      <TestRunner
        v-else-if="step === 'test' && store.currentPassage && store.activeSession"
        :passage="store.currentPassage"
        :test-type="store.activeSession.testType"
        :index="store.currentIndex"
        :total="store.passages.length"
        :is-last="store.isLastPassage"
        :blank-interval="store.blankInterval"
        :result="store.lastResult"
        @submit-recite="handleSubmitRecite"
        @submit-full-input="handleSubmitFullInput"
        @submit-fill-blank="handleSubmitFillBlank"
        @next="handleNext"
      />

      <div v-else-if="step === 'final' && finalSummary" class="memorization-page__final">
        <h2 class="memorization-page__final-title">암송 테스트 완료</h2>
        <p class="memorization-page__final-total">총 {{ finalSummary.totalPassages }}개 구절</p>

        <div v-if="finalSummary.averageScore !== null" class="memorization-page__final-score">
          평균 점수 <strong>{{ finalSummary.averageScore }}점</strong>
        </div>

        <div class="memorization-page__final-breakdown">
          <span>정답 {{ finalSummary.correctPassages }}개</span>
          <span>복습 필요 {{ finalSummary.needsReviewPassages }}개</span>
        </div>

        <div class="memorization-page__final-actions">
          <BaseButton style="width: 100%" @click="goDashboard">결과 확인</BaseButton>
          <BaseButton variant="secondary" style="width: 100%" @click="restart">다시 테스트</BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="loadError" @retry="load" />
</template>

<style scoped>
.memorization-page__final {
  text-align: center;
}
.memorization-page__final-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-lg);
}
.memorization-page__final-total {
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-5);
}
.memorization-page__final-score {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-4);
}
.memorization-page__final-score strong {
  color: var(--color-primary);
}
.memorization-page__final-breakdown {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
}
.memorization-page__final-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
