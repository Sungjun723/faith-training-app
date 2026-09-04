<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/utils/api";
import type { WeeklySummary } from "@/stores/weekly";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { useToast } from "@/composables/useToast";

interface Detail {
  user: { id: number; name: string; email: string; status: "active" | "inactive" };
  weeklySummary: WeeklySummary;
  recentDaily: { recordDate: string; meditationCompleted: boolean; prayerMinutes: number; readingPages: number }[];
}

const route = useRoute();
const detail = ref<Detail | null>(null);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    detail.value = await api.get<Detail>(`/admin/members/${route.params.id}`);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function toggleStatus() {
  if (!detail.value) return;
  const next = detail.value.user.status === "active" ? "inactive" : "active";
  await api.patch(`/admin/members/${detail.value.user.id}/status`, { status: next });
  await load();
}

const toast = useToast();
const newPassword = ref("");
const resettingPassword = ref(false);

async function resetPassword() {
  if (!detail.value) return;
  if (newPassword.value.length < 8) {
    toast.error("비밀번호는 8자 이상이어야 합니다.");
    return;
  }
  resettingPassword.value = true;
  try {
    await api.patch(`/admin/members/${detail.value.user.id}/password`, { newPassword: newPassword.value });
    toast.success("비밀번호가 변경되었습니다.");
    newPassword.value = "";
  } catch {
    toast.error("비밀번호 변경에 실패했습니다.");
  } finally {
    resettingPassword.value = false;
  }
}
</script>

<template>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="loadError" @retry="load" />
  <div class="admin-member-detail" v-else-if="detail">
    <h1 class="admin-member-detail__title">{{ detail.user.name }}</h1>
    <p class="admin-member-detail__email">{{ detail.user.email }}</p>

    <BaseCard class="admin-member-detail__section">
      <h2 class="admin-member-detail__section-title">이번 주 진행률</h2>
      <p class="admin-member-detail__progress">{{ detail.weeklySummary.overallProgress }}%</p>
    </BaseCard>

    <BaseCard class="admin-member-detail__section">
      <h2 class="admin-member-detail__section-title">최근 일별 기록</h2>
      <table class="admin-member-detail__table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>묵상</th>
            <th>기도(분)</th>
            <th>통독(p)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in detail.recentDaily" :key="r.recordDate">
            <td>{{ r.recordDate }}</td>
            <td>{{ r.meditationCompleted ? "✓" : "-" }}</td>
            <td>{{ r.prayerMinutes }}</td>
            <td>{{ r.readingPages }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseButton :variant="detail.user.status === 'active' ? 'danger' : 'primary'" @click="toggleStatus">
      {{ detail.user.status === "active" ? "휴면 처리" : "활동 회원으로 전환" }}
    </BaseButton>

    <BaseCard class="admin-member-detail__section">
      <h2 class="admin-member-detail__section-title">비밀번호 재설정</h2>
      <div class="admin-member-detail__password-row">
        <BaseInput v-model="newPassword" type="password" placeholder="새 비밀번호 (8자 이상)" />
        <BaseButton size="sm" :disabled="resettingPassword" @click="resetPassword">변경</BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.admin-member-detail__title {
  margin: 0;
  font-size: var(--font-size-xl);
}
.admin-member-detail__email {
  margin: var(--space-1) 0 var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.admin-member-detail__section {
  margin-bottom: var(--space-4);
}
.admin-member-detail__section-title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.admin-member-detail__progress {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.admin-member-detail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.admin-member-detail__table th,
.admin-member-detail__table td {
  text-align: left;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.admin-member-detail__password-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.admin-member-detail__password-row > *:first-child {
  flex: 1;
}
</style>
