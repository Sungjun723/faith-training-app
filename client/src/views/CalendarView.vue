<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTrainingStore } from "@/stores/training";
import TrainingCalendar from "@/components/calendar/TrainingCalendar.vue";
import DailyTrainingForm from "@/components/calendar/DailyTrainingForm.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const trainingStore = useTrainingStore();
const router = useRouter();

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
  selectedDate.value = null;
  router.push({ name: "weekly-summary", query: { week: week.id } });
}
</script>

<template>
  <div class="calendar-page">
    <div class="calendar-page__header">
      <BaseButton variant="ghost" size="sm" @click="prevMonth">‹</BaseButton>
      <h1 class="calendar-page__title">{{ year }}년 {{ month }}월</h1>
      <BaseButton variant="ghost" size="sm" @click="nextMonth">›</BaseButton>
    </div>

    <TrainingCalendar v-if="!loading && !loadError" :year="year" :month="month" :records="records" @select-date="(d) => (selectedDate = d)" />
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />

    <BaseModal v-model="showModal">
      <DailyTrainingForm v-if="selectedDate" :date="selectedDate" @open-weekly="goToWeekly" />
    </BaseModal>
  </div>
</template>

<style scoped>
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
</style>
