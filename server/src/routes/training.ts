import { Router } from "express";
import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { trainingRecords, weeklyTrainingRecords } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { isSunday } from "../utils/date.js";
import { getOrCreateWeekForDate, getWeekById } from "../services/weeks.js";
import { calculateWeeklySummary } from "../services/weeklyProgress.js";
import { env } from "../config/env.js";

export const trainingRouter = Router();
trainingRouter.use(requireAuth);

const monthQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

// 캘린더 렌더링용: 월 전체 데이터를 한 번에 반환 (문서 52번 성능 요구사항)
trainingRouter.get(
  "/month",
  asyncHandler(async (req, res) => {
    const { year, month } = monthQuerySchema.parse(req.query);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const records = await db.query.trainingRecords.findMany({
      where: and(
        eq(trainingRecords.userId, req.user!.userId),
        gte(trainingRecords.recordDate, start),
        lte(trainingRecords.recordDate, end)
      ),
    });
    res.json({ records });
  })
);

const dailyUpsertSchema = z.object({
  meditationCompleted: z.boolean().optional(),
  prayerMinutes: z.number().int().min(0).max(env.dailyPrayerTargetMinutes).optional(),
  readingPages: z.number().int().min(0).optional(),
});

trainingRouter.put(
  "/daily/:date",
  asyncHandler(async (req, res) => {
    const date = req.params.date; // YYYY-MM-DD
    const body = dailyUpsertSchema.parse(req.body);

    if (body.meditationCompleted === true && isSunday(date)) {
      throw new AppError("일요일에는 한 구절 묵상을 체크할 수 없습니다.", 400);
    }

    const existing = await db.query.trainingRecords.findFirst({
      where: and(eq(trainingRecords.userId, req.user!.userId), eq(trainingRecords.recordDate, date)),
    });

    if (existing) {
      await db
        .update(trainingRecords)
        .set(body)
        .where(eq(trainingRecords.id, existing.id));
    } else {
      await db.insert(trainingRecords).values({
        userId: req.user!.userId,
        recordDate: date,
        meditationCompleted: body.meditationCompleted ?? false,
        prayerMinutes: body.prayerMinutes ?? 0,
        readingPages: body.readingPages ?? 0,
      });
    }

    const saved = await db.query.trainingRecords.findFirst({
      where: and(eq(trainingRecords.userId, req.user!.userId), eq(trainingRecords.recordDate, date)),
    });
    res.json({ record: saved });
  })
);

const weeklyUpsertSchema = z.object({
  inductiveStudyCompleted: z.boolean().optional(),
  bookReadingCompleted: z.boolean().optional(),
  previewCompleted: z.boolean().optional(),
  sundayServiceCompleted: z.boolean().optional(),
  fridayServiceCompleted: z.boolean().optional(),
  smallGroupCompleted: z.boolean().optional(),
  memorizationCompleted: z.boolean().optional(),
});

trainingRouter.get(
  "/weekly/:weekId",
  asyncHandler(async (req, res) => {
    const weekId = Number(req.params.weekId);
    const record = await db.query.weeklyTrainingRecords.findFirst({
      where: and(eq(weeklyTrainingRecords.userId, req.user!.userId), eq(weeklyTrainingRecords.weekId, weekId)),
    });
    res.json({ record: record ?? null });
  })
);

trainingRouter.put(
  "/weekly/:weekId",
  asyncHandler(async (req, res) => {
    const weekId = Number(req.params.weekId);
    await getWeekById(weekId); // 존재하지 않으면 에러
    const body = weeklyUpsertSchema.parse(req.body);

    const existing = await db.query.weeklyTrainingRecords.findFirst({
      where: and(eq(weeklyTrainingRecords.userId, req.user!.userId), eq(weeklyTrainingRecords.weekId, weekId)),
    });

    if (existing) {
      await db.update(weeklyTrainingRecords).set(body).where(eq(weeklyTrainingRecords.id, existing.id));
    } else {
      await db.insert(weeklyTrainingRecords).values({ userId: req.user!.userId, weekId, ...body });
    }

    const saved = await db.query.weeklyTrainingRecords.findFirst({
      where: and(eq(weeklyTrainingRecords.userId, req.user!.userId), eq(weeklyTrainingRecords.weekId, weekId)),
    });
    res.json({ record: saved });
  })
);

trainingRouter.get(
  "/weekly/:weekId/summary",
  asyncHandler(async (req, res) => {
    const weekId = Number(req.params.weekId);
    const summary = await calculateWeeklySummary(req.user!.userId, weekId);
    res.json(summary);
  })
);

// 오늘이 속한 주차 정보를 가져오기 위한 헬퍼 엔드포인트
trainingRouter.get(
  "/current-week",
  asyncHandler(async (req, res) => {
    const week = await getOrCreateWeekForDate(new Date());
    res.json({ week });
  })
);

// 캘린더에서 임의의 날짜를 클릭했을 때 "이번 주"를 찾기 위한 엔드포인트
const weekForDateQuerySchema = z.object({ date: z.string() });
trainingRouter.get(
  "/week-for-date",
  asyncHandler(async (req, res) => {
    const { date } = weekForDateQuerySchema.parse(req.query);
    const week = await getOrCreateWeekForDate(new Date(`${date}T00:00:00`));
    res.json({ week });
  })
);
