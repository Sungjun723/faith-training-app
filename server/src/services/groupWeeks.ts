import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, groups } from "../db/schema.js";
import { toDateString } from "../utils/date.js";
import { AppError } from "../middleware/errorHandler.js";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface GroupWeekInfo {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
}

/** 그룹 시작일을 그대로 앵커로 쓴다 (요일 제한 없음 — 목요일/일요일 등 어떤 요일이든
 *  가능). 주차는 그 날짜로부터 정확히 7일 단위로 끊는다. */
function getGroupAnchor(startDate: string): Date {
  return new Date(`${startDate}T00:00:00`);
}

function truncateToDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function getGroupById(groupId: number) {
  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) throw new AppError("존재하지 않는 그룹입니다.", 404);
  return group;
}

/** 회원의 그룹을 조회한다. 그룹이 없으면 에러 (일반 회원은 그룹이 필수). */
export async function getUserGroup(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AppError("사용자를 찾을 수 없습니다.", 404);
  if (!user.groupId) {
    throw new AppError("그룹이 배정되지 않은 계정입니다. 관리자에게 문의해주세요.", 400);
  }
  return getGroupById(user.groupId);
}

/** 주어진 날짜가 그룹 시작일 기준 몇 주차인지 계산한다 (1부터 시작, 시작일 이전이면 1로 고정). */
function computeWeekNumber(anchor: Date, date: Date): number {
  const diff = truncateToDay(date).getTime() - truncateToDay(anchor).getTime();
  const weekNumber = Math.floor(diff / MS_PER_WEEK) + 1;
  return Math.max(1, weekNumber);
}

function weekInfoFromNumber(anchor: Date, weekNumber: number): GroupWeekInfo {
  const start = new Date(anchor);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { weekNumber, weekStart: toDateString(start), weekEnd: toDateString(end) };
}

export async function getCurrentWeekForUser(userId: number): Promise<GroupWeekInfo> {
  const group = await getUserGroup(userId);
  const anchor = getGroupAnchor(group.startDate);
  const weekNumber = computeWeekNumber(anchor, new Date());
  return weekInfoFromNumber(anchor, weekNumber);
}

export async function getWeekForDateForUser(userId: number, dateStr: string): Promise<GroupWeekInfo> {
  const group = await getUserGroup(userId);
  const anchor = getGroupAnchor(group.startDate);
  const weekNumber = computeWeekNumber(anchor, new Date(`${dateStr}T00:00:00`));
  return weekInfoFromNumber(anchor, weekNumber);
}

export async function getWeekInfoForUser(userId: number, weekNumber: number): Promise<GroupWeekInfo> {
  const group = await getUserGroup(userId);
  const anchor = getGroupAnchor(group.startDate);
  return weekInfoFromNumber(anchor, weekNumber);
}
