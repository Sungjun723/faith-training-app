import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { trainingRecords, weeklyTrainingRecords } from "../db/schema.js";
import { env } from "../config/env.js";
import { getWeekById } from "./weeks.js";

const WEEKLY_TRAINING_DAYS = env.weeklyTrainingDays; // 6 (월~토)
const DAILY_PRAYER_TARGET = env.dailyPrayerTargetMinutes; // 20
const DAILY_READING_TARGET = env.dailyReadingTargetPages; // 2

export interface WeeklySummary {
  week: { id: number; weekNumber: number; weekStart: string; weekEnd: string };
  daily: {
    meditation: { date: string; completed: boolean }[]; // 월~토, 일요일 제외
    meditationScore: number; // 0~1
  };
  prayer: {
    totalMinutes: number;
    averageMinutes: number;
    targetTotalMinutes: number;
    prayerScore: number; // 0~1
  };
  reading: {
    actualPages: number;
    targetPages: number;
    readingScore: number; // 0~1
  };
  weekly: {
    inductiveStudyCompleted: boolean;
    bookReadingCompleted: boolean;
    previewCompleted: boolean;
    sundayServiceCompleted: boolean;
    fridayServiceCompleted: boolean;
    smallGroupCompleted: boolean;
    memorizationCompleted: boolean;
    weeklyScore: number; // 0~1
  };
  overallProgress: number; // 0~100
}

export async function calculateWeeklySummary(userId: number, weekId: number): Promise<WeeklySummary> {
  const week = await getWeekById(weekId);

  const dailyRecords = await db.query.trainingRecords.findMany({
    where: and(
      eq(trainingRecords.userId, userId),
      gte(trainingRecords.recordDate, week.weekStart),
      lte(trainingRecords.recordDate, week.weekEnd)
    ),
  });

  // 월~토 6일의 날짜 목록 생성 (일요일 제외)
  const dayDates: string[] = [];
  const start = new Date(`${week.weekStart}T00:00:00`);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }

  const recordsByDate = new Map(dailyRecords.map((r) => [r.recordDate, r]));

  const meditation = dayDates.map((date) => ({
    date,
    completed: recordsByDate.get(date)?.meditationCompleted ?? false,
  }));
  const meditationCompletedCount = meditation.filter((m) => m.completed).length;
  const meditationScore = meditationCompletedCount / WEEKLY_TRAINING_DAYS;

  const totalPrayerMinutes = dailyRecords.reduce((sum, r) => sum + r.prayerMinutes, 0);
  const targetTotalMinutes = DAILY_PRAYER_TARGET * WEEKLY_TRAINING_DAYS;
  const prayerScore = Math.min(totalPrayerMinutes / targetTotalMinutes, 1);

  const actualPages = dailyRecords.reduce((sum, r) => sum + r.readingPages, 0);
  const targetPages = DAILY_READING_TARGET * WEEKLY_TRAINING_DAYS;
  const readingScore = Math.min(actualPages / targetPages, 1);

  const weekly = await db.query.weeklyTrainingRecords.findFirst({
    where: and(eq(weeklyTrainingRecords.userId, userId), eq(weeklyTrainingRecords.weekId, weekId)),
  });

  const weeklyFlags = {
    inductiveStudyCompleted: weekly?.inductiveStudyCompleted ?? false,
    bookReadingCompleted: weekly?.bookReadingCompleted ?? false,
    previewCompleted: weekly?.previewCompleted ?? false,
    sundayServiceCompleted: weekly?.sundayServiceCompleted ?? false,
    fridayServiceCompleted: weekly?.fridayServiceCompleted ?? false,
    smallGroupCompleted: weekly?.smallGroupCompleted ?? false,
    memorizationCompleted: weekly?.memorizationCompleted ?? false,
  };
  const weeklyCheckedCount = Object.values(weeklyFlags).filter(Boolean).length;
  const weeklyScore = weeklyCheckedCount / 7;

  const overallProgress = ((meditationScore + prayerScore + readingScore + weeklyScore) / 4) * 100;

  return {
    week: {
      id: week.id,
      weekNumber: week.weekNumber,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    },
    daily: { meditation, meditationScore },
    prayer: {
      totalMinutes: totalPrayerMinutes,
      averageMinutes: totalPrayerMinutes / WEEKLY_TRAINING_DAYS,
      targetTotalMinutes,
      prayerScore,
    },
    reading: { actualPages, targetPages, readingScore },
    weekly: { ...weeklyFlags, weeklyScore },
    overallProgress: Math.round(overallProgress * 10) / 10,
  };
}
