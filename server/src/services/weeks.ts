import { eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { weeks } from "../db/schema.js";
import { getWeekStart, getWeekEnd, toDateString } from "../utils/date.js";

/**
 * 주어진 날짜가 속한 주차를 조회하고, 없으면 생성한다 (lazy creation).
 * week_number는 기존 최대값 + 1로 자동 채번한다.
 */
export async function getOrCreateWeekForDate(date: Date) {
  const weekStartDate = getWeekStart(date);
  const weekStartStr = toDateString(weekStartDate);

  const existing = await db.query.weeks.findFirst({
    where: eq(weeks.weekStart, weekStartStr),
  });
  if (existing) return existing;

  const last = await db.query.weeks.findFirst({
    orderBy: desc(weeks.weekNumber),
  });
  const nextWeekNumber = (last?.weekNumber ?? 0) + 1;
  const weekEndStr = toDateString(getWeekEnd(weekStartDate));

  await db.insert(weeks).values({
    weekNumber: nextWeekNumber,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
  });

  const created = await db.query.weeks.findFirst({
    where: eq(weeks.weekStart, weekStartStr),
  });
  if (!created) throw new Error("주차 생성에 실패했습니다.");
  return created;
}

export async function getCurrentWeek() {
  return getOrCreateWeekForDate(new Date());
}

export async function getWeekById(weekId: number) {
  const week = await db.query.weeks.findFirst({ where: eq(weeks.id, weekId) });
  if (!week) throw new Error("존재하지 않는 주차입니다.");
  return week;
}
