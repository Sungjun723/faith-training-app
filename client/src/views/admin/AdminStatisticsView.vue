<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  currentWeekAverageProgress: number;
}
interface Member {
  id: number;
  name: string;
  thisWeekProgress: number;
}

const stats = ref<Stats | null>(null);
const members = ref<Member[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    stats.value = await api.get<Stats>("/admin/statistics");
    const { members: list } = await api.get<{ members: Member[] }>("/admin/members");
    members.value = [...list].sort((a, b) => b.thisWeekProgress - a.thisWeekProgress);
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
  <div class="admin-statistics" v-else>
    <h1 class="admin-statistics__title">전체 통계</h1>

    <div class="admin-statistics__summary" v-if="stats">
      <BaseCard class="admin-statistics__summary-card">
        <p class="admin-statistics__summary-label">전체 회원</p>
        <p class="admin-statistics__summary-value">{{ stats.totalMembers }}</p>
      </BaseCard>
      <BaseCard class="admin-statistics__summary-card">
        <p class="admin-statistics__summary-label">이번 주 평균 진행률</p>
        <p class="admin-statistics__summary-value">{{ stats.currentWeekAverageProgress }}%</p>
      </BaseCard>
    </div>

    <BaseCard>
      <h2 class="admin-statistics__section-title">회원별 이번 주 진행률</h2>
      <div class="admin-statistics__member-row" v-for="m in members" :key="m.id">
        <span class="admin-statistics__member-name">{{ m.name }}</span>
        <div class="admin-statistics__bar">
          <div class="admin-statistics__bar-fill" :style="{ width: `${m.thisWeekProgress}%` }" />
        </div>
        <span class="admin-statistics__member-value">{{ m.thisWeekProgress }}%</span>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.admin-statistics__title {
  font-size: var(--font-size-xl);
  margin: 0 0 var(--space-5);
}
.admin-statistics__summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.admin-statistics__summary-card {
  text-align: center;
}
.admin-statistics__summary-label {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.admin-statistics__summary-value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.admin-statistics__section-title {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.admin-statistics__member-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.admin-statistics__member-name {
  width: 80px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
}
.admin-statistics__bar {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.admin-statistics__bar-fill {
  height: 100%;
  background: var(--color-primary);
}
.admin-statistics__member-value {
  width: 40px;
  text-align: right;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
