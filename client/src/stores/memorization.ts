import { defineStore } from "pinia";
import { api } from "@/utils/api";

export type ScopeType = "single" | "cumulative";

export interface MemorizationWeekOption {
  weekNumber: number;
  weekPassageCount: number;
  cumulativePassageCount: number;
}

export interface Passage {
  id: number;
  weekNumber: number;
  book: string;
  chapterVerse: string;
  content: string;
  displayOrder: number;
}

export type TestType = "full_recite" | "fill_blank" | "full_input";

export interface Session {
  id: number;
  userId: number;
  scopeWeekNumber: number;
  scopeType: ScopeType;
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
    currentWeekNumber: null as number | null,
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
      const { weekOptions, currentWeekNumber } = await api.get<{
        weekOptions: MemorizationWeekOption[];
        currentWeekNumber: number;
      }>("/memorization/weeks");
      this.weekOptions = weekOptions;
      this.currentWeekNumber = currentWeekNumber;
      return weekOptions;
    },
    async startSession(scopeWeekNumber: number, testType: TestType, scopeType: ScopeType) {
      // 이전 테스트가 끝난 뒤 마지막 문항의 채점 결과가 store에 남아있으면,
      // 새 세션의 첫 문항이 뜨기도 전에 그 결과 화면이 먼저 보이는 버그가 있었다.
      this.lastResult = null;
      const { session } = await api.post<{ session: Session; resumed: boolean }>("/memorization/sessions", {
        scopeWeekNumber,
        scopeType,
        testType,
      });
      this.activeSession = session;
      // 세션의 scopeType(단일 주차 / 누적)에 맞는 구절 목록은 세션 자체에서 다시 조회한다.
      const { passages } = await api.get<{ passages: Passage[] }>(`/memorization/sessions/${session.id}`);
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
      this.lastResult = null;
      return summary;
    },
  },
});
