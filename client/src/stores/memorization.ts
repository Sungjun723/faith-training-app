import { defineStore } from "pinia";
import { api } from "@/utils/api";

export interface MemorizationWeekOption {
  id: number;
  weekNumber: number;
  weekStart: string;
  cumulativePassageCount: number;
}

export interface Passage {
  id: number;
  weekId: number;
  book: string;
  chapterVerse: string;
  content: string;
  displayOrder: number;
}

export type TestType = "full_recite" | "fill_blank" | "full_input";

export interface Session {
  id: number;
  userId: number;
  scopeWeekId: number;
  testType: TestType;
  totalPassages: number;
  status: "in_progress" | "completed";
}

export interface DiffItem {
  type: "correct" | "wrong" | "missing";
  text?: string;
  expected?: string;
  actual?: string;
}

export const useMemorizationStore = defineStore("memorization", {
  state: () => ({
    weekOptions: [] as MemorizationWeekOption[],
    currentWeekId: null as number | null,
    activeSession: null as Session | null,
    passages: [] as Passage[],
    currentIndex: 0,
    blankInterval: 3,
    lastResult: null as
      | { score: number | null; correctCount: number; wrongCount: number; missingCount: number; diffOrSnapshot: unknown }
      | null,
  }),
  getters: {
    currentPassage(state): Passage | undefined {
      return state.passages[state.currentIndex];
    },
    isLastPassage(state): boolean {
      return state.currentIndex >= state.passages.length - 1;
    },
  },
  actions: {
    async fetchSettings() {
      const { blankInterval } = await api.get<{ blankInterval: number }>("/memorization/settings");
      this.blankInterval = blankInterval;
      return blankInterval;
    },
    async fetchWeekOptions() {
      const { weeks, currentWeekId } = await api.get<{
        weeks: MemorizationWeekOption[];
        currentWeekId: number;
      }>("/memorization/weeks");
      this.weekOptions = weeks;
      this.currentWeekId = currentWeekId;
      return weeks;
    },
    async startSession(scopeWeekId: number, testType: TestType) {
      const { session } = await api.post<{ session: Session; resumed: boolean }>("/memorization/sessions", {
        scopeWeekId,
        testType,
      });
      this.activeSession = session;
      const { passages } = await api.get<{ passages: Passage[] }>(
        `/memorization/passages?uptoWeekId=${session.scopeWeekId}`
      );
      this.passages = passages;
      this.currentIndex = 0;
      return session;
    },
    async submitResult(payload: { userInput?: string; blanks?: string[]; answers?: string[] }) {
      if (!this.activeSession || !this.currentPassage) throw new Error("진행 중인 테스트가 없습니다.");
      const result = await api.post<{
        score: number | null;
        correctCount: number;
        wrongCount: number;
        missingCount: number;
        diffOrSnapshot: unknown;
      }>(`/memorization/sessions/${this.activeSession.id}/results`, {
        passageId: this.currentPassage.id,
        ...payload,
      });
      this.lastResult = result;
      return result;
    },
    nextPassage() {
      if (!this.isLastPassage) this.currentIndex += 1;
      this.lastResult = null;
    },
    async completeSession() {
      if (!this.activeSession) throw new Error("진행 중인 테스트가 없습니다.");
      const summary = await api.post<{
        totalPassages: number;
        averageScore: number | null;
        correctPassages: number;
        needsReviewPassages: number;
      }>(`/memorization/sessions/${this.activeSession.id}/complete`);
      this.activeSession = null;
      this.passages = [];
      this.currentIndex = 0;
      return summary;
    },
  },
});
