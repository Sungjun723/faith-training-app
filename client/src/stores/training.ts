import { defineStore } from "pinia";
import { api } from "@/utils/api";

export interface DailyRecord {
  id: number;
  userId: number;
  recordDate: string;
  meditationCompleted: boolean;
  prayerMinutes: number;
  readingPages: number;
}

interface CurrentWeek {
  id: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
}

export const useTrainingStore = defineStore("training", {
  state: () => ({
    // key: "YYYY-MM" → records
    monthCache: {} as Record<string, DailyRecord[]>,
    currentWeek: null as CurrentWeek | null,
  }),
  actions: {
    async fetchMonth(year: number, month: number, force = false) {
      const key = `${year}-${month}`;
      if (!force && this.monthCache[key]) return this.monthCache[key];
      const { records } = await api.get<{ records: DailyRecord[] }>(
        `/training/month?year=${year}&month=${month}`
      );
      this.monthCache[key] = records;
      return records;
    },
    recordFor(year: number, month: number, date: string): DailyRecord | undefined {
      const key = `${year}-${month}`;
      return this.monthCache[key]?.find((r) => r.recordDate === date);
    },
    async saveDaily(
      date: string,
      patch: Partial<Pick<DailyRecord, "meditationCompleted" | "prayerMinutes" | "readingPages">>
    ) {
      const { record } = await api.put<{ record: DailyRecord }>(`/training/daily/${date}`, patch);
      const [year, month] = date.split("-").map(Number);
      const key = `${year}-${month}`;
      const list = this.monthCache[key] ?? [];
      const idx = list.findIndex((r) => r.recordDate === date);
      if (idx >= 0) list[idx] = record;
      else list.push(record);
      this.monthCache[key] = [...list];
      return record;
    },
    async fetchCurrentWeek(force = false) {
      if (this.currentWeek && !force) return this.currentWeek;
      const { week } = await api.get<{ week: CurrentWeek }>("/training/current-week");
      this.currentWeek = week;
      return week;
    },
    async fetchWeekForDate(date: string) {
      const { week } = await api.get<{ week: CurrentWeek }>(`/training/week-for-date?date=${date}`);
      return week;
    },
  },
});
