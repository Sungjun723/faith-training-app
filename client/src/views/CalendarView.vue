<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTrainingStore } from "@/stores/training";
import TrainingCalendar from "@/components/calendar/TrainingCalendar.vue";
import DailyTrainingForm from "@/components/calendar/DailyTrainingForm.vue";
import WeeklySummaryPanel from "@/components/weekly/WeeklySummaryPanel.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const trainingStore = useTrainingStore();
const route = useRoute();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1); // 1-12

const selectedDate = ref<string | null>(null);
const showModal = computed({
  get: () => !!selectedDate.value,
  set: (v) => {
    if (!v) selectedDate.value = null;
  },
});

// 캘린더 옆(또는 아래)에 항상 표시되는 주간 결산 패널의 대상 주차.
// 기본값은 이번 주이며, 날짜를 클릭해 "이번 주 결산 보기"를 누르면 그 주로 전환된다.
const activeWeekId = ref<number | null>(null);

const records = computed(() => trainingStore.monthCache[`${year.value}-${month.value}`] ?? []);

const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    await trainingStore.fetchMonth(year.value, month.value);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch([year, month], load);

onMounted(async () => {
  const queryWeek = route.query.week;
  if (queryWeek) {
    activeWeekId.value = Number(queryWeek);
  } else {
    const week = await trainingStore.fetchCurrentWeek();
    activeWeekId.value = week.id;
  }
});

function prevMonth() {
  if (month.value === 1) {
    month.value = 12;
    year.value -= 1;
  } else {
    month.value -= 1;
  }
}
function nextMonth() {
  if (month.value === 12) {
    month.value = 1;
    year.value += 1;
  } else {
    month.value += 1;
  }
}

async function goToWeekly() {
  if (!selectedDate.value) return;
  const week = await trainingStore.fetchWeekForDate(selectedDate.value);
  activeWeekId.value = week.id;
  selectedDate.value = null;
}
</script>

<template>
  <div class="calendar-page">
    <div class="calendar-page__main">
      <div class="calendar-page__header">
        <BaseButton variant="ghost" size="sm" @click="prevMonth">‹</BaseButton>
        <h1 class="calendar-page__title">{{ year }}년 {{ month }}월</h1>
        <BaseButton variant="ghost" size="sm" @click="nextMonth">›</BaseButton>
      </div>

      <TrainingCalendar
        v-if="!loading && !loadError"
        :year="year"
        :month="month"
        :records="records"
        @select-date="(d) => (selectedDate = d)"
      />
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="loadError" @retry="load" />
    </div>

    <div class="calendar-page__side">
      <WeeklySummaryPanel :week-id="activeWeekId" />
    </div>

    <BaseModal v-model="showModal">
      <DailyTrainingForm v-if="selectedDate" :date="selectedDate" @open-weekly="goToWeekly" />
    </BaseModal>
  </div>
</template>

<style scoped>
.calendar-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.calendar-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.calendar-page__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  margin: 0;
}

@media (min-width: 1024px) {
  .calendar-page {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-8);
  }
  .calendar-page__main {
    flex: 1 1 0;
    min-width: 0;
  }
  .calendar-page__side {
    flex: 1 1 0;
    min-width: 0;
    max-height: calc(100vh - var(--header-height-desktop) - var(--space-8) * 2);
    overflow-y: auto;
    position: sticky;
    top: calc(var(--header-height-desktop) + var(--space-4));
  }
}
</style>
