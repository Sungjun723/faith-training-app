import { defineStore } from "pinia";
import { api } from "@/utils/api";

export interface WeeklySummary {
  week: { weekNumber: number; weekStart: string; weekEnd: string };
  daily: { meditation: { date: string; completed: boolean }[]; meditationScore: number };
  prayer: { totalMinutes: number; averageMinutes: number; targetTotalMinutes: number; prayerScore: number };
  reading: { actualPages: number; targetPages: number; readingScore: number };
  weekly: {
    inductiveStudyCompleted: boolean;
    bookReadingCompleted: boolean;
    previewCompleted: boolean;
    sundayServiceCompleted: boolean;
    fridayServiceCompleted: boolean;
    smallGroupCompleted: boolean;
    memorizationCompleted: boolean;
    weeklyScore: number;
  };
  overallProgress: number;
}

export type WeeklyFlagKey =
  | "inductiveStudyCompleted"
  | "bookReadingCompleted"
  | "previewCompleted"
  | "sundayServiceCompleted"
  | "fridayServiceCompleted"
  | "smallGroupCompleted"
  | "memorizationCompleted";

export const useWeeklyStore = defineStore("weekly", {
  state: () => ({
    summaries: {} as Record<number, WeeklySummary>,
  }),
  actions: {
    async fetchSummary(weekNumber: number, force = false) {
      if (!force && this.summaries[weekNumber]) return this.summaries[weekNumber];
      const summary = await api.get<WeeklySummary>(`/training/weekly/${weekNumber}/summary`);
      this.summaries[weekNumber] = summary;
      return summary;
    },
    async toggleFlag(weekNumber: number, key: WeeklyFlagKey, value: boolean) {
      await api.put(`/training/weekly/${weekNumber}`, { [key]: value });
      await this.fetchSummary(weekNumber, true);
    },
  },
});
