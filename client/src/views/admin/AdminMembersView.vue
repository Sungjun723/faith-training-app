<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api, ApiError } from "@/utils/api";
import { useToast } from "@/composables/useToast";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

interface Member {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
  groupId: number | null;
  groupName: string | null;
  thisWeekProgress: number;
}

interface Group {
  id: number;
  name: string;
  startDate: string;
}
interface Admin {
  id: number;
  name: string;
  email: string;
}

const toast = useToast();
const members = ref<Member[]>([]);
const groups = ref<Group[]>([]);
const admins = ref<Admin[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const [{ members: list }, { groups: groupList }, { admins: adminList }] = await Promise.all([
      api.get<{ members: Member[] }>("/admin/members"),
      api.get<{ groups: Group[] }>("/admin/groups"),
      api.get<{ admins: Admin[] }>("/admin/admins"),
    ]);
    members.value = list;
    groups.value = groupList;
    admins.value = adminList;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const showAddModal = ref(false);
const form = ref<{ name: string; email: string; password: string; role: "member" | "admin"; groupId: number | null }>(
  { name: "", email: "", password: "", role: "member", groupId: null }
);
const formError = ref("");
const submitting = ref(false);

function openAddModal() {
  form.value = { name: "", email: "", password: "", role: "member", groupId: groups.value[0]?.id ?? null };
  formError.value = "";
  showAddModal.value = true;
}

async function submitNewMember() {
  formError.value = "";
  if (!form.value.name || !form.value.email) {
    formError.value = "이름과 이메일을 입력해주세요.";
    return;
  }
  if (form.value.password.length < 8) {
    formError.value = "비밀번호는 8자 이상이어야 합니다.";
    return;
  }
  if (form.value.role === "member" && !form.value.groupId) {
    formError.value = "그룹을 선택해주세요. (먼저 그룹 관리에서 그룹을 만들어야 합니다)";
    return;
  }
  submitting.value = true;
  try {
    await api.post("/admin/members", {
      ...form.value,
      groupId: form.value.role === "admin" ? null : form.value.groupId,
    });
    showAddModal.value = false;
    toast.success(form.value.role === "admin" ? "관리자 계정이 추가되었습니다." : "회원이 추가되었습니다.");
    await load();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "회원 추가에 실패했습니다.";
  } finally {
    submitting.value = false;
  }
}

async function removeMember(m: Member) {
  if (!confirm(`"${m.name}" 회원을 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
  try {
    await api.delete(`/admin/members/${m.id}`);
    toast.success("회원이 삭제되었습니다.");
    await load();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
  }
}
</script>

<template>
  <div class="admin-members">
    <div class="admin-members__header">
      <h1 class="admin-members__title">회원 관리</h1>
      <BaseButton size="sm" @click="openAddModal">+ 회원 추가</BaseButton>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <BaseCard v-else-if="members.length === 0" :padded="true">
      <EmptyState message="등록된 회원이 없습니다." icon="users" />
    </BaseCard>
    <BaseCard v-else :padded="false">
      <table class="admin-members__table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>그룹</th>
            <th>이번 주</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td>
              <RouterLink :to="{ name: 'admin-member-detail', params: { id: m.id } }">{{ m.name }}</RouterLink>
            </td>
            <td class="admin-members__email">{{ m.email }}</td>
            <td>{{ m.groupName ?? "미배정" }}</td>
            <td>{{ m.thisWeekProgress }}%</td>
            <td>
              <span class="admin-members__status" :class="{ 'is-inactive': m.status === 'inactive' }">
                {{ m.status === "active" ? "활동" : "휴면" }}
              </span>
            </td>
            <td>
              <BaseButton size="sm" variant="danger" @click="removeMember(m)">삭제</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <h2 class="admin-members__admins-title">관리자 계정</h2>
    <BaseCard :padded="false">
      <table class="admin-members__table">
        <tbody>
          <tr v-for="a in admins" :key="a.id">
            <td>
              <RouterLink :to="{ name: 'admin-member-detail', params: { id: a.id } }">{{ a.name }}</RouterLink>
            </td>
            <td class="admin-members__email">{{ a.email }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseModal v-model="showAddModal" title="회원 추가">
      <div class="admin-members__form">
        <BaseInput v-model="form.name" label="이름" placeholder="홍길동" />
        <BaseInput v-model="form.email" type="email" label="이메일" placeholder="member@example.com" />
        <BaseInput v-model="form.password" type="password" label="초기 비밀번호 (8자 이상)" />
        <label class="admin-members__group-label">
          <span>역할</span>
          <select v-model="form.role">
            <option value="member">일반 회원</option>
            <option value="admin">관리자</option>
          </select>
        </label>
        <label v-if="form.role === 'member'" class="admin-members__group-label">
          <span>그룹</span>
          <select v-model.number="form.groupId">
            <option v-if="groups.length === 0" :value="null">먼저 그룹을 추가해주세요</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} ({{ g.startDate }} 시작)</option>
          </select>
        </label>
        <p v-if="formError" class="admin-members__form-error" role="alert">{{ formError }}</p>
        <BaseButton style="width: 100%" :disabled="submitting" @click="submitNewMember">
          {{ submitting ? "추가하는 중..." : "회원 추가" }}
        </BaseButton>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-members__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}
.admin-members__title {
  font-size: var(--font-size-xl);
  margin: 0;
}
.admin-members__admins-title {
  margin: var(--space-6) 0 var(--space-3);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
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
.admin-members__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.admin-members__group-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.admin-members__group-label select {
  min-height: var(--touch-target-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  background: var(--color-surface);
  color: var(--color-text);
}
.admin-members__form-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
