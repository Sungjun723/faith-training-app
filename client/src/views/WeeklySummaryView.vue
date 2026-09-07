<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTrainingStore } from "@/stores/training";
import WeeklySummaryPanel from "@/components/weekly/WeeklySummaryPanel.vue";

const route = useRoute();
const router = useRouter();
const trainingStore = useTrainingStore();
const weekNumber = ref<number | null>(null);

async function resolveWeekId() {
  const q = route.query.week;
  if (q) {
    weekNumber.value = Number(q);
  } else {
    const week = await trainingStore.fetchCurrentWeek();
    weekNumber.value = week.weekNumber;
  }
}

onMounted(resolveWeekId);
watch(() => route.query.week, resolveWeekId);

// 이전/다음 주 이동 시 주소창의 ?week=도 함께 갱신해 새로고침/공유해도 같은 주가 보이게 한다.
function handleWeekNumberUpdate(value: number) {
  weekNumber.value = value;
  router.replace({ query: { ...route.query, week: String(value) } });
}
</script>

<template>
  <WeeklySummaryPanel :week-number="weekNumber" @update:week-number="handleWeekNumberUpdate" />
</template>
