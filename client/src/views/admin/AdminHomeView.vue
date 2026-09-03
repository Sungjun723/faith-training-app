<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  currentWeekAverageProgress: number;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    stats.value = await api.get<Stats>("/admin/statistics");
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
  <div class="admin-home" v-else>
    <h1 class="admin-home__title">관리자</h1>

    <div class="admin-home__stats" v-if="stats">
      <BaseCard class="admin-home__stat">
        <p class="admin-home__stat-label">전체 회원</p>
        <p class="admin-home__stat-value">{{ stats.totalMembers }}</p>
      </BaseCard>
      <BaseCard class="admin-home__stat">
        <p class="admin-home__stat-label">활동 회원</p>
        <p class="admin-home__stat-value">{{ stats.activeMembers }}</p>
      </BaseCard>
      <BaseCard class="admin-home__stat">
        <p class="admin-home__stat-label">이번 주 평균</p>
        <p class="admin-home__stat-value">{{ stats.currentWeekAverageProgress }}%</p>
      </BaseCard>
    </div>

    <div class="admin-home__links">
      <RouterLink class="admin-home__link" :to="{ name: 'admin-members' }">👥 회원 관리</RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-memorization' }">📖 암송 구절 관리</RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-statistics' }">📊 전체 통계</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.admin-home__title {
  font-size: var(--font-size-xl);
  margin: 0 0 var(--space-5);
}
.admin-home__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.admin-home__stat {
  text-align: center;
}
.admin-home__stat-label {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.admin-home__stat-value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.admin-home__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.admin-home__link {
  display: block;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
}
</style>
