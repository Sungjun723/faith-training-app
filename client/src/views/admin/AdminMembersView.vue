<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

interface Member {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
  thisWeekProgress: number;
}

const members = ref<Member[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const { members: list } = await api.get<{ members: Member[] }>("/admin/members");
    members.value = list;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="admin-members">
    <h1 class="admin-members__title">회원 관리</h1>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <BaseCard v-else-if="members.length === 0" :padded="true">
      <EmptyState message="등록된 회원이 없습니다." icon="👥" />
    </BaseCard>
    <BaseCard v-else :padded="false">
      <table class="admin-members__table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>이번 주</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td>
              <RouterLink :to="{ name: 'admin-member-detail', params: { id: m.id } }">{{ m.name }}</RouterLink>
            </td>
            <td class="admin-members__email">{{ m.email }}</td>
            <td>{{ m.thisWeekProgress }}%</td>
            <td>
              <span class="admin-members__status" :class="{ 'is-inactive': m.status === 'inactive' }">
                {{ m.status === "active" ? "활동" : "휴면" }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>

<style scoped>
.admin-members__title {
  font-size: var(--font-size-xl);
  margin: 0 0 var(--space-5);
}
.admin-members__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.admin-members__table th,
.admin-members__table td {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.admin-members__table th {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
.admin-members__table a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.admin-members__email {
  color: var(--color-text-secondary);
}
.admin-members__status {
  display: inline-block;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: var(--font-size-xs);
}
.admin-members__status.is-inactive {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}
.admin-members__empty {
  padding: var(--space-6);
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
