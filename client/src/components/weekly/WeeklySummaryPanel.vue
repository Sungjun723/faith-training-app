<script setup lang="ts">
import { computed, watch } from "vue";
import { useWeeklyStore, type WeeklyFlagKey } from "@/stores/weekly";
import { useToast } from "@/composables/useToast";
import { weekdayLabel } from "@/utils/date";
import BaseCard from "@/components/common/BaseCard.vue";
import WeeklyChecklist from "@/components/weekly/WeeklyChecklist.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const props = defineProps<{ weekId: number | null }>();

const weeklyStore = useWeeklyStore();
const toast = useToast();

async function load() {
  if (props.weekId) await weeklyStore.fetchSummary(props.weekId, true);
}

watch(() => props.weekId, load, { immediate: true });

const summary = computed(() => (props.weekId ? weeklyStore.summaries[props.weekId] : undefined));

async function handleToggle(key: WeeklyFlagKey, value: boolean) {
  if (!props.weekId) return;
  try {
    await weeklyStore.toggleFlag(props.weekId, key, value);
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}
</script>

<template>
  <LoadingState v-if="weekId && !summary" message="주간 결산을 불러오는 중입니다..." />
  <div class="weekly-panel" v-else-if="summary">
    <h2 class="weekly-panel__title">
      {{ summary.week.weekNumber }}주차 결산
      <span class="weekly-panel__range">({{ summary.week.weekStart }} ~ {{ summary.week.weekEnd }})</span>
    </h2>

    <BaseCard class="weekly-panel__section">
      <h3 class="weekly-panel__section-title">전체 진행률</h3>
      <div class="weekly-panel__progress-bar">
        <div class="weekly-panel__progress-fill" :style="{ width: `${summary.overallProgress}%` }" />
      </div>
      <p class="weekly-panel__progress-label">{{ summary.overallProgress }}%</p>
    </BaseCard>

    <BaseCard class="weekly-panel__section">
      <h3 class="weekly-panel__section-title">한 구절 묵상</h3>
      <div class="weekly-panel__daily-row">
        <div v-for="d in summary.daily.meditation" :key="d.date" class="weekly-panel__daily-cell">
          <span class="weekly-panel__daily-weekday">{{ weekdayLabel(d.date) }}</span>
          <span class="weekly-panel__daily-mark" :class="{ 'is-done': d.completed }">
            {{ d.completed ? "✓" : "✕" }}
          </span>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="weekly-panel__section">
      <h3 class="weekly-panel__section-title">기도</h3>
      <p class="weekly-panel__stat">
        총 기도 시간 <strong>{{ summary.prayer.totalMinutes }}분</strong>
        <span class="weekly-panel__stat-sub">(목표 {{ summary.prayer.targetTotalMinutes }}분)</span>
      </p>
      <p class="weekly-panel__stat-sub">평균 {{ summary.prayer.averageMinutes.toFixed(1) }}분 / day</p>
    </BaseCard>

    <BaseCard class="weekly-panel__section">
      <h3 class="weekly-panel__section-title">통독</h3>
      <p class="weekly-panel__stat">
        {{ summary.reading.actualPages }} / {{ summary.reading.targetPages }} pages
      </p>
    </BaseCard>

    <BaseCard class="weekly-panel__section">
      <h3 class="weekly-panel__section-title">주간 훈련</h3>
      <WeeklyChecklist :weekly="summary.weekly" @toggle="handleToggle" />
    </BaseCard>
  </div>
</template>

<style scoped>
.weekly-panel__title {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
}
.weekly-panel__range {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
}
.weekly-panel__section {
  margin-bottom: var(--space-4);
}
.weekly-panel__section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-4);
}
.weekly-panel__progress-bar {
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.weekly-panel__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--easing-standard);
}
.weekly-panel__progress-label {
  margin: var(--space-2) 0 0;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.weekly-panel__daily-row {
  display: flex;
  justify-content: space-between;
}
.weekly-panel__daily-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.weekly-panel__daily-weekday {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.weekly-panel__daily-mark {
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
.weekly-panel__daily-mark.is-done {
  background: var(--color-success-light);
  color: var(--color-success);
}
.weekly-panel__stat {
  margin: 0 0 var(--space-1);
}
.weekly-panel__stat-sub {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
