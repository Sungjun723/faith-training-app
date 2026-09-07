<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, ApiError } from "@/utils/api";
import type { WeeklySummary } from "@/stores/weekly";
import { useAuthStore } from "@/stores/auth";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { useToast } from "@/composables/useToast";

interface Detail {
  user: {
    id: number;
    name: string;
    email: string;
    role: "member" | "admin";
    status: "active" | "inactive";
    groupId: number | null;
    groupName: string | null;
  };
  weeklySummary: WeeklySummary | null;
  recentDaily: { recordDate: string; meditationCompleted: boolean; prayerMinutes: number; readingPages: number }[];
}

interface Group {
  id: number;
  name: string;
  startDate: string;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const detail = ref<Detail | null>(null);
const groups = ref<Group[]>([]);
const loading = ref(true);
const loadError = ref(false);
const isSelf = () => detail.value?.user.id === auth.user?.id;

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const [d, { groups: groupList }] = await Promise.all([
      api.get<Detail>(`/admin/members/${route.params.id}`),
      api.get<{ groups: Group[] }>("/admin/groups"),
    ]);
    detail.value = d;
    groups.value = groupList;
    selectedGroupId.value = d.user.groupId;
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

const selectedGroupId = ref<number | null>(null);
const changingGroup = ref(false);

async function changeGroup() {
  if (!detail.value || !selectedGroupId.value) return;
  changingGroup.value = true;
  try {
    await api.patch(`/admin/members/${detail.value.user.id}/group`, { groupId: selectedGroupId.value });
    toast.success("그룹이 변경되었습니다.");
    await load();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "그룹 변경에 실패했습니다.");
  } finally {
    changingGroup.value = false;
  }
}

const changingRole = ref(false);

async function promoteToAdmin() {
  if (!detail.value) return;
  if (!confirm(`"${detail.value.user.name}"님을 관리자로 전환할까요?`)) return;
  changingRole.value = true;
  try {
    await api.patch(`/admin/members/${detail.value.user.id}/role`, { role: "admin" });
    toast.success("관리자로 전환되었습니다.");
    await load();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "전환에 실패했습니다.");
  } finally {
    changingRole.value = false;
  }
}

async function demoteToMember() {
  if (!detail.value || !selectedGroupId.value) {
    toast.error("먼저 배정할 그룹을 선택해주세요.");
    return;
  }
  if (!confirm(`"${detail.value.user.name}"님을 일반 회원으로 전환할까요?`)) return;
  changingRole.value = true;
  try {
    await api.patch(`/admin/members/${detail.value.user.id}/role`, {
      role: "member",
      groupId: selectedGroupId.value,
    });
    toast.success("일반 회원으로 전환되었습니다.");
    await load();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "전환에 실패했습니다.");
  } finally {
    changingRole.value = false;
  }
}

const deleting = ref(false);

async function removeMember() {
  if (!detail.value) return;
  if (!confirm(`"${detail.value.user.name}" 회원을 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
  deleting.value = true;
  try {
    await api.delete(`/admin/members/${detail.value.user.id}`);
    toast.success("회원이 삭제되었습니다.");
    router.push({ name: "admin-members" });
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="loadError" @retry="load" />
  <div class="admin-member-detail" v-else-if="detail">
    <h1 class="admin-member-detail__title">{{ detail.user.name }}</h1>
    <p class="admin-member-detail__email">{{ detail.user.email }}</p>
    <p class="admin-member-detail__role">{{ detail.user.role === "admin" ? "관리자" : "일반 회원" }}</p>

    <BaseCard class="admin-member-detail__section" v-if="detail.user.role === 'member'">
      <h2 class="admin-member-detail__section-title">그룹</h2>
      <div class="admin-member-detail__group-row">
        <select v-model.number="selectedGroupId">
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} ({{ g.startDate }} 시작)</option>
        </select>
        <BaseButton size="sm" :disabled="changingGroup || selectedGroupId === detail.user.groupId" @click="changeGroup">
          변경
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard class="admin-member-detail__section" v-if="detail.weeklySummary">
      <h2 class="admin-member-detail__section-title">이번 주 진행률 ({{ detail.weeklySummary.week.weekNumber }}주차)</h2>
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

    <BaseCard class="admin-member-detail__section" v-if="!isSelf()">
      <h2 class="admin-member-detail__section-title">권한</h2>
      <p v-if="detail.user.role === 'member'" class="admin-member-detail__role-hint">
        이 회원을 관리자로 전환합니다. 전환 즉시 그룹에서 제외됩니다.
      </p>
      <BaseButton
        v-if="detail.user.role === 'member'"
        size="sm"
        variant="secondary"
        :disabled="changingRole"
        @click="promoteToAdmin"
      >
        관리자로 전환
      </BaseButton>
      <template v-else>
        <p class="admin-member-detail__role-hint">일반 회원으로 전환 시 배정할 그룹을 선택하세요.</p>
        <div class="admin-member-detail__group-row">
          <select v-model.number="selectedGroupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} ({{ g.startDate }} 시작)</option>
          </select>
          <BaseButton size="sm" variant="secondary" :disabled="changingRole" @click="demoteToMember">
            일반 회원으로 전환
          </BaseButton>
        </div>
      </template>
    </BaseCard>

    <BaseButton
      v-if="!isSelf() && detail.user.role !== 'admin'"
      variant="danger"
      :disabled="deleting"
      @click="removeMember"
    >
      회원 삭제
    </BaseButton>
  </div>
</template>

<style scoped>
.admin-member-detail__title {
  margin: 0;
  font-size: var(--font-size-xl);
}
.admin-member-detail__email {
  margin: var(--space-1) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.admin-member-detail__role {
  margin: 0 0 var(--space-5);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.admin-member-detail__role-hint {
  margin: 0 0 var(--space-3);
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
.admin-member-detail__group-row {
  display: flex;
  gap: var(--space-3);
}
.admin-member-detail__group-row select {
  flex: 1;
  min-height: var(--touch-target-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  background: var(--color-surface);
  color: var(--color-text);
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
