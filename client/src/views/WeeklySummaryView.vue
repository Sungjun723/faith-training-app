<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTrainingStore } from "@/stores/training";
import WeeklySummaryPanel from "@/components/weekly/WeeklySummaryPanel.vue";

const route = useRoute();
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
</script>

<template>
  <WeeklySummaryPanel :week-number="weekNumber" />
</template>
