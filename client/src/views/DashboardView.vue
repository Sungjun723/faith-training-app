<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useTrainingStore } from "@/stores/training";
import { useWeeklyStore } from "@/stores/weekly";
import { toDateString, isSunday, formatKoreanDate } from "@/utils/date";
import { useToast } from "@/composables/useToast";
import { api } from "@/utils/api";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseCheckbox from "@/components/common/BaseCheckbox.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import Icon from "@/components/common/Icon.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const auth = useAuthStore();
const trainingStore = useTrainingStore();
const weeklyStore = useWeeklyStore();
const toast = useToast();

const today = new Date();
const todayStr = toDateString(today);
const sundayToday = isSunday(todayStr);

const loading = ref(true);
const loadError = ref(false);
const weekNumber = ref<number | null>(null);

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}
const announcements = ref<Announcement[]>([]);

async function loadAnnouncements() {
  try {
    const { announcements: list } = await api.get<{ announcements: Announcement[] }>("/announcements/active");
    announcements.value = list;
  } catch {
    announcements.value = [];
  }
}

interface Meditation {
  date: string;
  title: string;
  verse: string;
  content: string;
}
const meditation = ref<Meditation | null>(null);

async function loadMeditation() {
  try {
    const { meditation: m } = await api.get<{ meditation: Meditation | null }>("/meditation/today");
    meditation.value = m;
  } catch {
    meditation.value = null;
  }
}

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    await trainingStore.fetchMonth(today.getFullYear(), today.getMonth() + 1);
    const week = await trainingStore.fetchCurrentWeek();
    weekNumber.value = week.weekNumber;
    await weeklyStore.fetchSummary(week.weekNumber);
    await loadAnnouncements();
    await loadMeditation();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const todayRecord = computed(() =>
  trainingStore.recordFor(today.getFullYear(), today.getMonth() + 1, todayStr)
);
const summary = computed(() => (weekNumber.value ? weeklyStore.summaries[weekNumber.value] : undefined));

async function toggleMeditation(value: boolean) {
  try {
    await trainingStore.saveDaily(todayStr, { meditationCompleted: value });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

const prayerInput = ref(String(todayRecord.value?.prayerMinutes ?? 0));
async function savePrayer() {
  const minutes = Math.max(0, Math.min(20, Number(prayerInput.value) || 0));
  try {
    await trainingStore.saveDaily(todayStr, { prayerMinutes: minutes });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function toggleReading(value: boolean) {
  try {
    await trainingStore.saveDaily(todayStr, { readingPages: value ? 2 : 0 });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}
</script>

<template>
  <div class="dashboard">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" @retry="load" />
    <template v-else>
    <h1 class="dashboard__greeting">{{ auth.user?.name }}님, 안녕하세요 👋</h1>
    <p class="dashboard__date">{{ formatKoreanDate(todayStr) }}</p>

    <BaseCard
      v-for="a in announcements"
      :key="a.id"
      class="dashboard__section dashboard__announcement"
    >
      <p class="dashboard__announcement-label">📢 공지사항</p>
      <h2 class="dashboard__announcement-title">{{ a.title }}</h2>
      <p class="dashboard__announcement-content">{{ a.content }}</p>
    </BaseCard>

    <div class="dashboard__columns">
      <div class="dashboard__col">
        <BaseCard class="dashboard__section">
          <h2 class="dashboard__section-title">오늘의 훈련</h2>

          <div class="dashboard__today-item">
            <template v-if="sundayToday">
              <span class="dashboard__sunday-note">일요일은 한 구절 묵상을 쉬어가는 날입니다 🙏</span>
            </template>
            <BaseCheckbox
              v-else
              :model-value="todayRecord?.meditationCompleted ?? false"
              label="한 구절 묵상"
              @update:model-value="toggleMeditation"
            />
          </div>

          <div class="dashboard__today-item dashboard__prayer">
            <span class="dashboard__item-label">기도 (분, 최대 20분)</span>
            <div class="dashboard__prayer-input">
              <BaseInput v-model="prayerInput" type="number" :min="0" :max="20" @change="savePrayer" />
            </div>
          </div>

          <div class="dashboard__today-item">
            <BaseCheckbox
              :model-value="(todayRecord?.readingPages ?? 0) >= 2"
              label="통독 2페이지"
              @update:model-value="toggleReading"
            />
          </div>
        </BaseCard>

        <BaseCard v-if="summary" class="dashboard__section">
          <h2 class="dashboard__section-title">이번 주 진행률</h2>
          <div class="dashboard__progress-bar">
            <div class="dashboard__progress-fill" :style="{ width: `${summary.overallProgress}%` }" />
          </div>
          <p class="dashboard__progress-label">{{ summary.overallProgress }}%</p>
        </BaseCard>

        <div class="dashboard__links">
          <RouterLink class="dashboard__link" :to="{ name: 'calendar' }">
            <Icon name="calendar" :size="18" /> 캘린더 &amp; 주간 결산
          </RouterLink>
          <RouterLink class="dashboard__link" :to="{ name: 'memorization' }">
            <Icon name="book" :size="18" /> 암송 테스트 시작하기
          </RouterLink>
        </div>
      </div>

      <div class="dashboard__col">
        <BaseCard class="dashboard__section dashboard__meditation">
          <template v-if="meditation">
            <p class="dashboard__meditation-label">📖 한 구절 묵상</p>
            <h2 class="dashboard__meditation-title">{{ meditation.title }}</h2>
            <p class="dashboard__meditation-verse">{{ meditation.verse }}</p>
            <p class="dashboard__meditation-content">{{ meditation.content }}</p>
          </template>
          <EmptyState v-else message="오늘의 한 구절 묵상이 아직 준비되지 않았어요." icon="book" />
        </BaseCard>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard__greeting {
  font-size: var(--font-size-xl);
  margin: 0 0 var(--space-1);
}
.dashboard__date {
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-5);
  font-size: var(--font-size-sm);
}
.dashboard__section {
  margin-bottom: var(--space-4);
}
.dashboard__section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-4);
}
.dashboard__announcement {
  background: var(--color-primary-light);
}
.dashboard__announcement-label {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.dashboard__announcement-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.dashboard__announcement-content {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}
.dashboard__today-item {
  padding: var(--space-2) 0;
}
.dashboard__sunday-note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.dashboard__item-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.dashboard__prayer-input {
  max-width: 140px;
}
.dashboard__progress-bar {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  overflow: hidden;
}
.dashboard__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--easing-standard);
}
.dashboard__progress-label {
  margin: var(--space-2) 0 0;
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}
.dashboard__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.dashboard__link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
.dashboard__columns {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.dashboard__col {
  flex: 1 1 0;
  min-width: 0;
}
.dashboard__meditation-label {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.dashboard__meditation-title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}
.dashboard__meditation-verse {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.dashboard__meditation-content {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed, 1.6);
  white-space: pre-wrap;
}

@media (min-width: 1024px) {
  .dashboard__columns {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-8);
  }
}
</style>
