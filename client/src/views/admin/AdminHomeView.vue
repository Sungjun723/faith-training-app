<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import Icon from "@/components/common/Icon.vue";
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
      <RouterLink class="admin-home__link" :to="{ name: 'admin-members' }">
        <Icon name="users" :size="18" /> 회원 관리
      </RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-groups' }">
        <Icon name="calendar" :size="18" /> 그룹 관리
      </RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-memorization' }">
        <Icon name="book" :size="18" /> 암송 구절 관리
      </RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-statistics' }">
        <Icon name="chart" :size="18" /> 전체 통계
      </RouterLink>
      <RouterLink class="admin-home__link" :to="{ name: 'admin-announcements' }">
        <Icon name="document" :size="18" /> 공지사항 관리
      </RouterLink>
    </div>

    <BaseCard v-if="members.length > 0" class="admin-home__members">
      <h2 class="admin-home__section-title">회원별 이번 주 진행률</h2>
      <div class="admin-home__member-row" v-for="m in members" :key="m.id">
        <span class="admin-home__member-name">{{ m.name }}</span>
        <div class="admin-home__bar">
          <div class="admin-home__bar-fill" :style="{ width: `${m.thisWeekProgress}%` }" />
        </div>
        <span class="admin-home__member-value">{{ m.thisWeekProgress }}%</span>
      </div>
    </BaseCard>
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  color: var(--color-text);
}
.admin-home__members {
  margin-top: var(--space-5);
}
.admin-home__section-title {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.admin-home__member-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.admin-home__member-name {
  width: 80px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
}
.admin-home__bar {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.admin-home__bar-fill {
  height: 100%;
  background: var(--color-primary);
}
.admin-home__member-value {
  width: 40px;
  text-align: right;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
