<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTrainingStore } from "@/stores/training";
import { useWeeklyStore, type WeeklyFlagKey } from "@/stores/weekly";
import { useToast } from "@/composables/useToast";
import { weekdayLabel } from "@/utils/date";
import BaseCard from "@/components/common/BaseCard.vue";
import WeeklyChecklist from "@/components/weekly/WeeklyChecklist.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const route = useRoute();
const trainingStore = useTrainingStore();
const weeklyStore = useWeeklyStore();
const toast = useToast();

const weekId = ref<number | null>(null);
const loading = ref(true);
const loadError = ref(false);

async function resolveWeekId() {
  const q = route.query.week;
  if (q) {
    weekId.value = Number(q);
  } else {
    const week = await trainingStore.fetchCurrentWeek();
    weekId.value = week.id;
  }
}

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    await resolveWeekId();
    if (weekId.value) await weeklyStore.fetchSummary(weekId.value, true);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => route.query.week, load);

const summary = computed(() => (weekId.value ? weeklyStore.summaries[weekId.value] : undefined));

async function handleToggle(key: WeeklyFlagKey, value: boolean) {
  if (!weekId.value) return;
  try {
    await weeklyStore.toggleFlag(weekId.value, key, value);
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}
</script>

<template>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="loadError" @retry="load" />
  <div class="weekly-page" v-else-if="summary">
    <h1 class="weekly-page__title">
      {{ summary.week.weekNumber }}주차 결산
      <span class="weekly-page__range">({{ summary.week.weekStart }} ~ {{ summary.week.weekEnd }})</span>
    </h1>

    <BaseCard class="weekly-page__section">
      <h2 class="weekly-page__section-title">전체 진행률</h2>
      <div class="weekly-page__progress-bar">
        <div class="weekly-page__progress-fill" :style="{ width: `${summary.overallProgress}%` }" />
      </div>
      <p class="weekly-page__progress-label">{{ summary.overallProgress }}%</p>
    </BaseCard>

    <BaseCard class="weekly-page__section">
      <h2 class="weekly-page__section-title">한 구절 묵상</h2>
      <div class="weekly-page__daily-row">
        <div v-for="d in summary.daily.meditation" :key="d.date" class="weekly-page__daily-cell">
          <span class="weekly-page__daily-weekday">{{ weekdayLabel(d.date) }}</span>
          <span class="weekly-page__daily-mark" :class="{ 'is-done': d.completed }">
            {{ d.completed ? "✓" : "✕" }}
          </span>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="weekly-page__section">
      <h2 class="weekly-page__section-title">기도</h2>
      <p class="weekly-page__stat">
        총 기도 시간 <strong>{{ summary.prayer.totalMinutes }}분</strong>
        <span class="weekly-page__stat-sub">(목표 {{ summary.prayer.targetTotalMinutes }}분)</span>
      </p>
      <p class="weekly-page__stat-sub">평균 {{ summary.prayer.averageMinutes.toFixed(1) }}분 / day</p>
    </BaseCard>

    <BaseCard class="weekly-page__section">
      <h2 class="weekly-page__section-title">통독</h2>
      <p class="weekly-page__stat">
        {{ summary.reading.actualPages }} / {{ summary.reading.targetPages }} pages
      </p>
    </BaseCard>

    <BaseCard class="weekly-page__section">
      <h2 class="weekly-page__section-title">주간 훈련</h2>
      <WeeklyChecklist :weekly="summary.weekly" @toggle="handleToggle" />
    </BaseCard>
  </div>
</template>

<style scoped>
.weekly-page__title {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
}
.weekly-page__range {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
}
.weekly-page__section {
  margin-bottom: var(--space-4);
}
.weekly-page__section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-4);
}
.weekly-page__progress-bar {
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.weekly-page__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--easing-standard);
}
.weekly-page__progress-label {
  margin: var(--space-2) 0 0;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.weekly-page__daily-row {
  display: flex;
  justify-content: space-between;
}
.weekly-page__daily-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.weekly-page__daily-weekday {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.weekly-page__daily-mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  font-size: var(--font-size-sm);
}
.weekly-page__daily-mark.is-done {
  background: var(--color-success-light);
  color: var(--color-success);
}
.weekly-page__stat {
  margin: 0 0 var(--space-1);
}
.weekly-page__stat-sub {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
