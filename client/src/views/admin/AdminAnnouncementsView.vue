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

interface Announcement {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

const toast = useToast();
const announcements = ref<Announcement[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const { announcements: list } = await api.get<{ announcements: Announcement[] }>("/admin/announcements");
    announcements.value = list;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const showAddModal = ref(false);
const form = ref({ title: "", content: "" });
const formError = ref("");
const submitting = ref(false);

function openAddModal() {
  form.value = { title: "", content: "" };
  formError.value = "";
  showAddModal.value = true;
}

async function submitNewAnnouncement() {
  formError.value = "";
  if (!form.value.title || !form.value.content) {
    formError.value = "제목과 내용을 입력해주세요.";
    return;
  }
  submitting.value = true;
  try {
    await api.post("/admin/announcements", form.value);
    showAddModal.value = false;
    toast.success("공지사항이 등록되었습니다.");
    await load();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "등록에 실패했습니다.";
  } finally {
    submitting.value = false;
  }
}

async function toggleActive(a: Announcement) {
  try {
    await api.put(`/admin/announcements/${a.id}`, { isActive: !a.isActive });
    await load();
  } catch {
    toast.error("변경에 실패했습니다.");
  }
}

async function remove(a: Announcement) {
  if (!confirm(`"${a.title}" 공지사항을 삭제할까요?`)) return;
  try {
    await api.delete(`/admin/announcements/${a.id}`);
    toast.success("삭제되었습니다.");
    await load();
  } catch {
    toast.error("삭제에 실패했습니다.");
  }
}
</script>

<template>
  <div class="admin-announcements">
    <div class="admin-announcements__header">
      <h1 class="admin-announcements__title">공지사항 관리</h1>
      <BaseButton size="sm" @click="openAddModal">+ 공지 등록</BaseButton>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <BaseCard v-else-if="announcements.length === 0" :padded="true">
      <EmptyState message="등록된 공지사항이 없습니다." icon="document" />
    </BaseCard>
    <BaseCard v-else v-for="a in announcements" :key="a.id" class="admin-announcements__item">
      <div class="admin-announcements__item-header">
        <h2 class="admin-announcements__item-title">{{ a.title }}</h2>
        <span class="admin-announcements__status" :class="{ 'is-inactive': !a.isActive }">
          {{ a.isActive ? "노출 중" : "비노출" }}
        </span>
      </div>
      <p class="admin-announcements__item-content">{{ a.content }}</p>
      <div class="admin-announcements__item-actions">
        <BaseButton size="sm" variant="secondary" @click="toggleActive(a)">
          {{ a.isActive ? "비노출로 전환" : "노출로 전환" }}
        </BaseButton>
        <BaseButton size="sm" variant="danger" @click="remove(a)">삭제</BaseButton>
      </div>
    </BaseCard>

    <BaseModal v-model="showAddModal" title="공지 등록">
      <div class="admin-announcements__form">
        <BaseInput v-model="form.title" label="제목" placeholder="공지 제목" />
        <label class="admin-announcements__content-label">
          <span>내용</span>
          <textarea v-model="form.content" rows="5" placeholder="공지 내용을 입력하세요" />
        </label>
        <p v-if="formError" class="admin-announcements__form-error" role="alert">{{ formError }}</p>
        <BaseButton style="width: 100%" :disabled="submitting" @click="submitNewAnnouncement">
          {{ submitting ? "등록하는 중..." : "등록" }}
        </BaseButton>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-announcements__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}
.admin-announcements__title {
  font-size: var(--font-size-xl);
  margin: 0;
}
.admin-announcements__item {
  margin-bottom: var(--space-3);
}
.admin-announcements__item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.admin-announcements__item-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.admin-announcements__item-content {
  margin: 0 0 var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
}
.admin-announcements__status {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: var(--font-size-xs);
}
.admin-announcements__status.is-inactive {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}
.admin-announcements__item-actions {
  display: flex;
  gap: var(--space-2);
}
.admin-announcements__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.admin-announcements__content-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.admin-announcements__content-label textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
}
.admin-announcements__form-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
