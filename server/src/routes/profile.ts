import { Router } from "express";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  users,
  memorizationPassages,
  memorizationResults,
  memorizationTestSessions,
  trainingRecords,
} from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { getCurrentWeek, getWeekById } from "../services/weeks.js";
import { calculateWeeklySummary } from "../services/weeklyProgress.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
    if (!user) throw new AppError("사용자를 찾을 수 없습니다.", 404);

    const currentWeek = await getCurrentWeek();
    const weeklySummary = await calculateWeeklySummary(user.id, currentWeek.id);

    // 이번 달 진행률: 이번 달 range의 daily record 기반 평균 (간단화된 산식)
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const monthRecords = await db.query.trainingRecords.findMany({
      where: and(
        eq(trainingRecords.userId, user.id),
        gte(trainingRecords.recordDate, monthStart),
        lte(trainingRecords.recordDate, monthEnd)
      ),
    });
    const nonSundayRecords = monthRecords; // record는애초 일요일에 meditation 저장 안 되므로 그대로 집계
    const meditationDays = nonSundayRecords.filter((r) => r.meditationCompleted).length;
    const totalDaysSoFar = nonSundayRecords.length || 1;
    const monthlyProgress = Math.round((meditationDays / totalDaysSoFar) * 1000) / 10;

    // 암송 진행 상황: 전체 등록 구절 수 대비, 이 사용자가 완료 처리한 구절 수(distinct)
    const totalPassages = await db.query.memorizationPassages.findMany();

    const myCompletedResults = await db
      .select({ passageId: memorizationResults.passageId })
      .from(memorizationResults)
      .innerJoin(memorizationTestSessions, eq(memorizationResults.sessionId, memorizationTestSessions.id))
      .where(and(eq(memorizationTestSessions.userId, user.id), isNotNull(memorizationResults.completedAt)));

    const completedPassageIds = new Set(myCompletedResults.map((r) => r.passageId));

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
      thisWeekProgress: weeklySummary.overallProgress,
      thisMonthProgress: monthlyProgress,
      memorization: {
        totalPassages: totalPassages.length,
        completedPassages: completedPassageIds.size,
      },
    });
  })
);
