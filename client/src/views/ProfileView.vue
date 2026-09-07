<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

interface ProfileData {
  user: { id: number; name: string; email: string; profileImage: string | null; createdAt: string };
  thisWeekProgress: number;
  thisMonthProgress: number;
  memorization: { totalPassages: number; completedPassages: number };
  weeklyBreakdown: { weekNumber: number; overallProgress: number }[];
}

const data = ref<ProfileData | null>(null);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    data.value = await api.get<ProfileData>("/profile/me");
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="loadError" @retry="load" />
  <div class="profile-page" v-else-if="data">
    <div class="profile-page__header">
      <div class="profile-page__avatar" aria-hidden="true">
        {{ data.user.name.charAt(0) }}
      </div>
      <h1 class="profile-page__name">{{ data.user.name }}</h1>
      <p class="profile-page__email">{{ data.user.email }}</p>
    </div>

    <div class="profile-page__stats">
      <BaseCard class="profile-page__stat-card">
        <p class="profile-page__stat-label">이번 주</p>
        <p class="profile-page__stat-value">{{ data.thisWeekProgress }}%</p>
      </BaseCard>
      <BaseCard class="profile-page__stat-card">
        <p class="profile-page__stat-label">이번 달</p>
        <p class="profile-page__stat-value">{{ data.thisMonthProgress }}%</p>
      </BaseCard>
      <BaseCard class="profile-page__stat-card">
        <p class="profile-page__stat-label">암송</p>
        <p class="profile-page__stat-value">
          {{ data.memorization.completedPassages }} / {{ data.memorization.totalPassages }}
        </p>
      </BaseCard>
    </div>

    <BaseCard v-if="data.weeklyBreakdown.length > 0" class="profile-page__weekly">
      <h2 class="profile-page__weekly-title">주차별 통계</h2>
      <div class="profile-page__weekly-row" v-for="w in [...data.weeklyBreakdown].reverse()" :key="w.weekNumber">
        <span class="profile-page__weekly-label">{{ w.weekNumber }}주차</span>
        <div class="profile-page__weekly-bar">
          <div class="profile-page__weekly-bar-fill" :style="{ width: `${w.overallProgress}%` }" />
        </div>
        <span class="profile-page__weekly-value">{{ w.overallProgress }}%</span>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.profile-page__header {
  text-align: center;
  margin-bottom: var(--space-6);
}
.profile-page__avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}
.profile-page__name {
  margin: 0;
  font-size: var(--font-size-lg);
}
.profile-page__email {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.profile-page__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.profile-page__stat-card {
  text-align: center;
}
.profile-page__stat-label {
  margin: 0 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.profile-page__stat-value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.profile-page__weekly {
  margin-top: var(--space-4);
}
.profile-page__weekly-title {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.profile-page__weekly-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.profile-page__weekly-label {
  width: 56px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
}
.profile-page__weekly-bar {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.profile-page__weekly-bar-fill {
  height: 100%;
  background: var(--color-primary);
}
.profile-page__weekly-value {
  width: 40px;
  text-align: right;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
