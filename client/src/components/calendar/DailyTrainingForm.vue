<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTrainingStore } from "@/stores/training";
import { useToast } from "@/composables/useToast";
import { formatKoreanDate, isSunday } from "@/utils/date";
import BaseCheckbox from "@/components/common/BaseCheckbox.vue";
import BaseInput from "@/components/common/BaseInput.vue";

const props = defineProps<{ date: string }>();
const emit = defineEmits<{ (e: "open-weekly"): void }>();

const trainingStore = useTrainingStore();
const toast = useToast();

const [year, month] = props.date.split("-").map(Number);
const record = computed(() => trainingStore.recordFor(year, month, props.date));
const sunday = computed(() => isSunday(props.date));

const prayerInput = ref(String(record.value?.prayerMinutes ?? 0));
watch(record, (r) => {
  prayerInput.value = String(r?.prayerMinutes ?? 0);
});

async function toggleMeditation(value: boolean) {
  try {
    await trainingStore.saveDaily(props.date, { meditationCompleted: value });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function savePrayer() {
  const minutes = Math.max(0, Math.min(20, Number(prayerInput.value) || 0));
  prayerInput.value = String(minutes);
  try {
    await trainingStore.saveDaily(props.date, { prayerMinutes: minutes });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}

async function toggleReading(value: boolean) {
  try {
    await trainingStore.saveDaily(props.date, { readingPages: value ? 2 : 0 });
    toast.success("✓ 저장되었습니다.");
  } catch {
    toast.error("저장하지 못했습니다. 다시 시도해주세요.");
  }
}
</script>

<template>
  <div class="daily-form">
    <p class="daily-form__date">{{ formatKoreanDate(date) }}</p>

    <div class="daily-form__row">
      <template v-if="sunday">
        <p class="daily-form__sunday-note">일요일은 한 구절 묵상을 쉬어가는 날입니다 🙏</p>
      </template>
      <BaseCheckbox
        v-else
        :model-value="record?.meditationCompleted ?? false"
        label="한 구절 묵상"
        @update:model-value="toggleMeditation"
      />
    </div>

    <div class="daily-form__row">
      <span class="daily-form__label">기도 시간 (분, 최대 20분)</span>
      <BaseInput v-model="prayerInput" type="number" :min="0" :max="20" @change="savePrayer" />
    </div>

    <div class="daily-form__row">
      <BaseCheckbox
        :model-value="(record?.readingPages ?? 0) >= 2"
        label="통독 2페이지"
        @update:model-value="toggleReading"
      />
    </div>

    <button type="button" class="daily-form__weekly-link" @click="emit('open-weekly')">
      이번 주 결산 보기 →
    </button>
  </div>
</template>

<style scoped>
.daily-form__date {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-5);
}
.daily-form__row {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}
.daily-form__row:last-of-type {
  border-bottom: none;
}
.daily-form__label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.daily-form__sunday-note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
.daily-form__weekly-link {
  margin-top: var(--space-4);
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  padding: var(--space-2) 0;
}
</style>
