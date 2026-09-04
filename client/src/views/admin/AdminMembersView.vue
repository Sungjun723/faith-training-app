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
  thisWeekProgress: number;
}

const toast = useToast();
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

const showAddModal = ref(false);
const form = ref({ name: "", email: "", password: "" });
const formError = ref("");
const submitting = ref(false);

function openAddModal() {
  form.value = { name: "", email: "", password: "" };
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
  submitting.value = true;
  try {
    await api.post("/admin/members", { ...form.value, role: "member" });
    showAddModal.value = false;
    toast.success("회원이 추가되었습니다.");
    await load();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "회원 추가에 실패했습니다.";
  } finally {
    submitting.value = false;
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

    <BaseModal v-model="showAddModal" title="회원 추가">
      <div class="admin-members__form">
        <BaseInput v-model="form.name" label="이름" placeholder="홍길동" />
        <BaseInput v-model="form.email" type="email" label="이메일" placeholder="member@example.com" />
        <BaseInput v-model="form.password" type="password" label="초기 비밀번호 (8자 이상)" />
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
.admin-members__form-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
