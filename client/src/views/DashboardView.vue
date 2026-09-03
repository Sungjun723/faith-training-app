<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useTrainingStore } from "@/stores/training";
import { useWeeklyStore } from "@/stores/weekly";
import { toDateString, isSunday, formatKoreanDate } from "@/utils/date";
import { useToast } from "@/composables/useToast";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseCheckbox from "@/components/common/BaseCheckbox.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const auth = useAuthStore();
const trainingStore = useTrainingStore();
const weeklyStore = useWeeklyStore();
const toast = useToast();

const today = new Date();
const todayStr = toDateString(today);
const sundayToday = isSunday(todayStr);

const loading = ref(true);
const loadError = ref(false);
const weekId = ref<number | null>(null);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    await trainingStore.fetchMonth(today.getFullYear(), today.getMonth() + 1);
    const week = await trainingStore.fetchCurrentWeek();
    weekId.value = week.id;
    await weeklyStore.fetchSummary(week.id);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const todayRecord = computed(() =>
  trainingStore.recordFor(today.getFullYear(), today.getMonth() + 1, todayStr)
);
const summary = computed(() => (weekId.value ? weeklyStore.summaries[weekId.value] : undefined));

async function toggleMeditation(value: boolean) {
  try {
    await trainingStore.saveDaily(todayStr, { meditationCompleted: value });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

const prayerInput = ref(String(todayRecord.value?.prayerMinutes ?? 0));
async function savePrayer() {
  const minutes = Math.max(0, Math.min(20, Number(prayerInput.value) || 0));
  try {
    await trainingStore.saveDaily(todayStr, { prayerMinutes: minutes });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function toggleReading(value: boolean) {
  try {
    await trainingStore.saveDaily(todayStr, { readingPages: value ? 2 : 0 });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}
</script>

<template>
  <div class="dashboard">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <template v-else>
    <h1 class="dashboard__greeting">{{ auth.user?.name }}님, 안녕하세요 👋</h1>
    <p class="dashboard__date">{{ formatKoreanDate(todayStr) }}</p>

    <BaseCard class="dashboard__section">
      <h2 class="dashboard__section-title">오늘의 훈련</h2>

      <div class="dashboard__today-item">
        <template v-if="sundayToday">
          <span class="dashboard__sunday-note">일요일은 한 구절 묵상을 쉬어가는 날입니다 🙏</span>
        </template>
        <BaseCheckbox
          v-else
          :model-value="todayRecord?.meditationCompleted ?? false"
          label="한 구절 묵상"
          @update:model-value="toggleMeditation"
        />
      </div>

      <div class="dashboard__today-item dashboard__prayer">
        <span class="dashboard__item-label">기도 (분, 최대 20분)</span>
        <div class="dashboard__prayer-input">
          <BaseInput v-model="prayerInput" type="number" :min="0" :max="20" @change="savePrayer" />
        </div>
      </div>

      <div class="dashboard__today-item">
        <BaseCheckbox
          :model-value="(todayRecord?.readingPages ?? 0) >= 2"
          label="통독 2페이지"
          @update:model-value="toggleReading"
        />
      </div>
    </BaseCard>

    <BaseCard v-if="summary" class="dashboard__section">
      <h2 class="dashboard__section-title">이번 주 진행률</h2>
      <div class="dashboard__progress-bar">
        <div class="dashboard__progress-fill" :style="{ width: `${summary.overallProgress}%` }" />
      </div>
      <p class="dashboard__progress-label">{{ summary.overallProgress }}%</p>
    </BaseCard>

    <div class="dashboard__links">
      <RouterLink class="dashboard__link" :to="{ name: 'calendar' }">📅 캘린더에서 자세히 보기</RouterLink>
      <RouterLink class="dashboard__link" :to="{ name: 'weekly-summary' }">📊 주간 결산 보기</RouterLink>
      <RouterLink class="dashboard__link" :to="{ name: 'memorization' }">📖 암송 테스트 시작하기</RouterLink>
    </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard__greeting {
  font-size: var(--font-size-xl);
  margin: 0 0 var(--space-1);
}
.dashboard__date {
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-5);
  font-size: var(--font-size-sm);
}
.dashboard__section {
  margin-bottom: var(--space-4);
}
.dashboard__section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-4);
}
.dashboard__today-item {
  padding: var(--space-2) 0;
}
.dashboard__sunday-note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.dashboard__item-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.dashboard__prayer-input {
  max-width: 140px;
}
.dashboard__progress-bar {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.dashboard__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--easing-standard);
}
.dashboard__progress-label {
  margin: var(--space-2) 0 0;
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}
.dashboard__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.dashboard__link {
  display: block;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
</style>
