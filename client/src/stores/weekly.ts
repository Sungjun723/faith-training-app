import { defineStore } from "pinia";
import { api } from "@/utils/api";

export interface WeeklySummary {
  week: { id: number; weekNumber: number; weekStart: string; weekEnd: string };
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
    async fetchSummary(weekId: number, force = false) {
      if (!force && this.summaries[weekId]) return this.summaries[weekId];
      const summary = await api.get<WeeklySummary>(`/training/weekly/${weekId}/summary`);
      this.summaries[weekId] = summary;
      return summary;
    },
    async toggleFlag(weekId: number, key: WeeklyFlagKey, value: boolean) {
      await api.put(`/training/weekly/${weekId}`, { [key]: value });
      await this.fetchSummary(weekId, true);
    },
  },
});
