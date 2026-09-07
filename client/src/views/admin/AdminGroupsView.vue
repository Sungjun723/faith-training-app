<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, ApiError } from "@/utils/api";
import { useToast } from "@/composables/useToast";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

interface Group {
  id: number;
  name: string;
  startDate: string;
  memberCount: number;
}

const toast = useToast();
const groups = ref<Group[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const { groups: list } = await api.get<{ groups: Group[] }>("/admin/groups");
    groups.value = list;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const showModal = ref(false);
const editingGroup = ref<Group | null>(null);
const form = ref({ name: "", startDate: "" });
const formError = ref("");
const submitting = ref(false);

function openAdd() {
  editingGroup.value = null;
  form.value = { name: "", startDate: "" };
  formError.value = "";
  showModal.value = true;
}

function openEdit(g: Group) {
  editingGroup.value = g;
  form.value = { name: g.name, startDate: g.startDate };
  formError.value = "";
  showModal.value = true;
}

async function submit() {
  formError.value = "";
  if (!form.value.name || !form.value.startDate) {
    formError.value = "그룹 이름과 시작일을 모두 입력해주세요.";
    return;
  }
  submitting.value = true;
  try {
    if (editingGroup.value) {
      await api.put(`/admin/groups/${editingGroup.value.id}`, form.value);
    } else {
      await api.post("/admin/groups", form.value);
    }
    showModal.value = false;
    toast.success("✓ 저장되었습니다.");
    await load();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "저장에 실패했습니다.";
  } finally {
    submitting.value = false;
  }
}

async function remove(g: Group) {
  try {
    await api.delete(`/admin/groups/${g.id}`);
    toast.success("삭제되었습니다.");
    await load();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "삭제하지 못했습니다.");
  }
}
</script>

<template>
  <div class="admin-groups">
    <div class="admin-groups__header">
      <h1 class="admin-groups__title">그룹 관리</h1>
      <BaseButton size="sm" @click="openAdd">+ 그룹 추가</BaseButton>
    </div>
    <p class="admin-groups__desc">
      같은 그룹에 속한 회원들은 그룹의 시작일을 기준으로 "몇 주차"가 함께 계산됩니다. 시작일은 요일에 상관없이
      원하는 날짜로 지정할 수 있습니다.
    </p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <BaseCard v-else-if="groups.length === 0">
      <EmptyState message="등록된 그룹이 없습니다. 먼저 그룹을 추가해주세요." icon="users" />
    </BaseCard>
    <BaseCard v-else :padded="false">
      <table class="admin-groups__table">
        <thead>
          <tr>
            <th>그룹명</th>
            <th>시작일</th>
            <th>회원 수</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in groups" :key="g.id">
            <td>{{ g.name }}</td>
            <td>{{ g.startDate }}</td>
            <td>{{ g.memberCount }}명</td>
            <td class="admin-groups__actions">
              <button type="button" @click="openEdit(g)">수정</button>
              <button type="button" class="is-danger" @click="remove(g)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseModal v-model="showModal" :title="editingGroup ? '그룹 수정' : '그룹 추가'">
      <div class="admin-groups__form">
        <BaseInput v-model="form.name" label="그룹 이름" placeholder="예: 그룹 A" />
        <BaseInput v-model="form.startDate" type="date" label="시작일" />
        <p v-if="formError" class="admin-groups__form-error" role="alert">{{ formError }}</p>
        <BaseButton style="width: 100%" :disabled="submitting" @click="submit">
          {{ submitting ? "저장하는 중..." : "저장" }}
        </BaseButton>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-groups__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.admin-groups__title {
  font-size: var(--font-size-xl);
  margin: 0;
}
.admin-groups__desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--space-5);
}
.admin-groups__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.admin-groups__table th,
.admin-groups__table td {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.admin-groups__table th {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
.admin-groups__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
.admin-groups__actions button {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.admin-groups__actions button.is-danger {
  color: var(--color-danger);
}
.admin-groups__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.admin-groups__form-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
