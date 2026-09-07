<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/utils/api";
import { useToast } from "@/composables/useToast";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

interface Passage {
  id: number;
  weekNumber: number;
  book: string;
  chapterVerse: string;
  content: string;
  displayOrder: number;
}

const toast = useToast();
// 암송 구절은 그룹과 무관하게 순수 주차 번호로만 관리한다 (그룹 A/B 상관없이 공통).
const weekNumbers = ref<number[]>([]);
const selectedWeekNumber = ref<number | null>(null);
const passages = ref<Passage[]>([]);
const loading = ref(true);
const loadError = ref(false);

const showPassageModal = ref(false);
const editingPassage = ref<Passage | null>(null);
const form = ref({ book: "", chapterVerse: "", content: "", displayOrder: 1 });

const newWeekNumberInput = ref<number | null>(null);

const blankInterval = ref(3);

async function loadSettings() {
  const { blankInterval: interval } = await api.get<{ blankInterval: number }>("/admin/settings");
  blankInterval.value = interval;
}

async function saveBlankInterval() {
  try {
    const { blankInterval: saved } = await api.put<{ blankInterval: number }>("/admin/settings", {
      blankInterval: blankInterval.value,
    });
    blankInterval.value = saved;
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function loadWeekNumbers() {
  const { weekNumbers: list } = await api.get<{ weekNumbers: number[] }>("/admin/memorization/weeks");
  weekNumbers.value = list;
  if (!selectedWeekNumber.value && list.length > 0) {
    selectedWeekNumber.value = list[list.length - 1];
  }
}

async function loadPassages() {
  if (!selectedWeekNumber.value) return;
  const { passages: list } = await api.get<{ passages: Passage[] }>(
    `/admin/memorization/passages?weekNumber=${selectedWeekNumber.value}`
  );
  passages.value = list;
}

async function initialLoad() {
  loading.value = true;
  loadError.value = false;
  try {
    await loadWeekNumbers();
    await loadPassages();
    await loadSettings();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(initialLoad);

async function selectWeek(weekNumber: number) {
  selectedWeekNumber.value = weekNumber;
  await loadPassages();
}

function openAddPassage() {
  editingPassage.value = null;
  form.value = { book: "", chapterVerse: "", content: "", displayOrder: passages.value.length + 1 };
  showPassageModal.value = true;
}

function openEditPassage(p: Passage) {
  editingPassage.value = p;
  form.value = { book: p.book, chapterVerse: p.chapterVerse, content: p.content, displayOrder: p.displayOrder };
  showPassageModal.value = true;
}

async function savePassage() {
  if (!selectedWeekNumber.value) return;
  try {
    if (editingPassage.value) {
      await api.put(`/admin/memorization/passages/${editingPassage.value.id}`, form.value);
    } else {
      await api.post("/admin/memorization/passages", { ...form.value, weekNumber: selectedWeekNumber.value });
    }
    showPassageModal.value = false;
    await loadWeekNumbers();
    await loadPassages();
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function deletePassage(id: number) {
  try {
    await api.delete(`/admin/memorization/passages/${id}`);
    await loadPassages();
    toast.success("삭제되었습니다.");
  } catch {
    toast.error("삭제하지 못했습니다.");
  }
}

// 주차는 별도로 "생성"하는 개념이 아니라, 그 번호로 구절을 하나라도 등록하면
// 자연스럽게 목록에 나타난다. 아직 구절이 없는 새 주차 번호로 먼저 이동해서
// 구절을 추가할 수 있도록 이 입력창을 둔다.
function goToWeekNumber() {
  if (!newWeekNumberInput.value || newWeekNumberInput.value < 1) return;
  if (!weekNumbers.value.includes(newWeekNumberInput.value)) {
    weekNumbers.value = [...weekNumbers.value, newWeekNumberInput.value].sort((a, b) => a - b);
  }
  selectedWeekNumber.value = newWeekNumberInput.value;
  newWeekNumberInput.value = null;
  loadPassages();
}
</script>

<template>
  <div class="admin-memorization">
    <h1 class="admin-memorization__title">암송 구절 관리</h1>
    <p class="admin-memorization__desc">
      구절은 그룹과 무관하게 주차 번호로만 관리됩니다. 그룹 A든 B든 "3주차 구절"은 항상 동일하게 보입니다.
    </p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="initialLoad" />
    <template v-else>
    <BaseCard class="admin-memorization__settings">
      <span class="admin-memorization__settings-label">빈칸 암송 간격</span>
      <div class="admin-memorization__settings-control">
        <select v-model.number="blankInterval">
          <option :value="2">2단어마다 1칸</option>
          <option :value="3">3단어마다 1칸</option>
          <option :value="4">4단어마다 1칸</option>
          <option :value="5">5단어마다 1칸</option>
        </select>
        <BaseButton size="sm" @click="saveBlankInterval">저장</BaseButton>
      </div>
    </BaseCard>

    <div class="admin-memorization__week-nav">
      <div class="admin-memorization__weeks">
        <button
          v-for="w in weekNumbers"
          :key="w"
          type="button"
          class="admin-memorization__week-chip"
          :class="{ 'is-active': selectedWeekNumber === w }"
          @click="selectWeek(w)"
        >
          {{ w }}주차
        </button>
      </div>
      <div class="admin-memorization__week-add">
        <input v-model.number="newWeekNumberInput" type="number" min="1" placeholder="주차 번호" />
        <BaseButton size="sm" variant="secondary" @click="goToWeekNumber">이동/추가</BaseButton>
      </div>
    </div>

    <BaseCard v-if="weekNumbers.length === 0">
      <EmptyState message="아직 등록된 구절이 없습니다. 위에서 주차 번호를 입력해 시작해보세요." icon="calendar" />
    </BaseCard>
    <BaseCard v-else>
      <div class="admin-memorization__list-header">
        <span class="admin-memorization__count">{{ selectedWeekNumber }}주차 · {{ passages.length }}개 구절</span>
        <BaseButton size="sm" @click="openAddPassage">+ 암송 구절 추가</BaseButton>
      </div>

      <ul class="admin-memorization__list" v-if="passages.length > 0">
        <li v-for="p in passages" :key="p.id" class="admin-memorization__item">
          <div>
            <p class="admin-memorization__item-ref">{{ p.book }} {{ p.chapterVerse }}</p>
            <p class="admin-memorization__item-content">{{ p.content }}</p>
          </div>
          <div class="admin-memorization__item-actions">
            <button type="button" @click="openEditPassage(p)">수정</button>
            <button type="button" class="is-danger" @click="deletePassage(p.id)">삭제</button>
          </div>
        </li>
      </ul>
      <EmptyState v-else message="이 주차에 등록된 구절이 없습니다." icon="book" />
    </BaseCard>
    </template>

    <BaseModal v-model="showPassageModal" :title="editingPassage ? '구절 수정' : '구절 추가'">
      <div class="admin-memorization__form">
        <BaseInput v-model="form.book" label="성경 권" placeholder="요한복음" />
        <BaseInput v-model="form.chapterVerse" label="장/절" placeholder="3:16" />
        <label class="admin-memorization__content-label">
          <span>구절 내용</span>
          <textarea v-model="form.content" rows="4" />
        </label>
        <BaseInput v-model.number="form.displayOrder" type="number" label="순서" />
        <BaseButton style="width: 100%" @click="savePassage">저장</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-memorization__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-xl);
}
.admin-memorization__desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--space-4);
}
.admin-memorization__settings {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.admin-memorization__settings-label {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}
.admin-memorization__settings-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.admin-memorization__settings-control select {
  min-height: var(--touch-target-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  background: var(--color-surface);
}
.admin-memorization__week-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.admin-memorization__weeks {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}
.admin-memorization__week-chip {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  min-height: var(--touch-target-min);
}
.admin-memorization__week-chip.is-active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.admin-memorization__week-add {
  display: flex;
  gap: var(--space-2);
}
.admin-memorization__week-add input {
  width: 120px;
  min-height: var(--touch-target-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
}
.admin-memorization__list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.admin-memorization__count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.admin-memorization__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.admin-memorization__item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}
.admin-memorization__item:last-child {
  border-bottom: none;
}
.admin-memorization__item-ref {
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-1);
}
.admin-memorization__item-content {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.admin-memorization__item-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
.admin-memorization__item-actions button {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.admin-memorization__item-actions button.is-danger {
  color: var(--color-danger);
}
.admin-memorization__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.admin-memorization__content-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.admin-memorization__content-label textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-family: inherit;
  resize: vertical;
}
</style>
