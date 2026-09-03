<script setup lang="ts">
import { computed } from "vue";
import type { DailyRecord } from "@/stores/training";
import { toDateString } from "@/utils/date";

const props = defineProps<{
  year: number;
  month: number; // 1-12
  records: DailyRecord[];
}>();
const emit = defineEmits<{ (e: "select-date", date: string): void }>();

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarCell {
  date: string | null;
  dayNumber: number | null;
  isSunday: boolean;
  isToday: boolean;
  meditationCompleted: boolean;
  hasPrayer: boolean;
  hasReading: boolean;
}

const recordMap = computed(() => new Map(props.records.map((r) => [r.recordDate, r])));

const cells = computed<CalendarCell[]>(() => {
  const firstDay = new Date(props.year, props.month - 1, 1);
  const daysInMonth = new Date(props.year, props.month, 0).getDate();
  const leadingBlanks = firstDay.getDay(); // 0=일요일 시작
  const todayStr = toDateString(new Date());

  const result: CalendarCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) {
    result.push({ date: null, dayNumber: null, isSunday: false, isToday: false, meditationCompleted: false, hasPrayer: false, hasReading: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${props.year}-${String(props.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const record = recordMap.value.get(date);
    const dayOfWeek = new Date(props.year, props.month - 1, d).getDay();
    result.push({
      date,
      dayNumber: d,
      isSunday: dayOfWeek === 0,
      isToday: date === todayStr,
      meditationCompleted: record?.meditationCompleted ?? false,
      hasPrayer: (record?.prayerMinutes ?? 0) > 0,
      hasReading: (record?.readingPages ?? 0) > 0,
    });
  }
  return result;
});
</script>

<template>
  <div class="training-calendar">
    <div class="training-calendar__headers">
      <span
        v-for="h in WEEKDAY_HEADERS"
        :key="h"
        class="training-calendar__header"
        :class="{ 'is-sunday': h === '일' }"
        >{{ h }}</span
      >
    </div>
    <div class="training-calendar__grid">
      <button
        v-for="(cell, idx) in cells"
        :key="idx"
        type="button"
        class="training-calendar__cell"
        :class="{
          'is-empty': !cell.date,
          'is-today': cell.isToday,
          'is-sunday': cell.isSunday,
        }"
        :disabled="!cell.date"
        :aria-label="cell.date ? `${cell.dayNumber}일` : undefined"
        @click="cell.date && emit('select-date', cell.date)"
      >
        <span v-if="cell.dayNumber" class="training-calendar__day-number">{{ cell.dayNumber }}</span>
        <span v-if="cell.dayNumber" class="training-calendar__dots">
          <span v-if="cell.meditationCompleted" class="training-calendar__dot training-calendar__dot--primary" />
          <span v-if="cell.hasPrayer" class="training-calendar__dot training-calendar__dot--accent" />
          <span v-if="cell.hasReading" class="training-calendar__dot training-calendar__dot--success" />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.training-calendar__headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: var(--space-2);
}
.training-calendar__header {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
.training-calendar__header.is-sunday {
  color: var(--color-danger);
}
.training-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.training-calendar__cell {
  aspect-ratio: 1;
  min-height: var(--touch-target-min);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--easing-standard), transform var(--duration-fast) var(--easing-standard);
}
.training-calendar__cell:active {
  transform: scale(0.95);
}
.training-calendar__cell.is-empty {
  background: transparent;
  cursor: default;
}
.training-calendar__cell.is-today {
  border-color: var(--color-primary);
}
.training-calendar__cell.is-sunday .training-calendar__day-number {
  color: var(--color-danger);
}
.training-calendar__day-number {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.training-calendar__dots {
  display: flex;
  gap: 3px;
  min-height: 6px;
}
.training-calendar__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.training-calendar__dot--primary {
  background: var(--color-primary);
}
.training-calendar__dot--accent {
  background: var(--color-accent);
}
.training-calendar__dot--success {
  background: var(--color-success);
}
</style>
