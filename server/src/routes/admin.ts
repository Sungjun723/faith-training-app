import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  users,
  weeks,
  memorizationPassages,
  weeklyTrainingRecords,
  trainingRecords,
} from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { getCurrentWeek, getOrCreateWeekForDate } from "../services/weeks.js";
import { calculateWeeklySummary } from "../services/weeklyProgress.js";
import { getSettings, updateBlankInterval } from "../services/settings.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// 전역 설정 (빈칸 암송 간격 등)
// ---------------------------------------------------------------------------
adminRouter.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    res.json({ blankInterval: settings.blankInterval });
  })
);

const settingsUpdateSchema = z.object({ blankInterval: z.number().int().min(2).max(10) });

adminRouter.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { blankInterval } = settingsUpdateSchema.parse(req.body);
    const settings = await updateBlankInterval(blankInterval);
    res.json({ blankInterval: settings.blankInterval });
  })
);

// ---------------------------------------------------------------------------
// 회원 관리
// ---------------------------------------------------------------------------
adminRouter.get(
  "/members",
  asyncHandler(async (req, res) => {
    const allUsers = await db.query.users.findMany({ orderBy: [asc(users.name)] });
    const currentWeek = await getCurrentWeek();

    const withProgress = await Promise.all(
      allUsers
        .filter((u) => u.role === "member")
        .map(async (u) => {
          const summary = await calculateWeeklySummary(u.id, currentWeek.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            status: u.status,
            thisWeekProgress: summary.overallProgress,
          };
        })
    );

    res.json({ members: withProgress });
  })
);

adminRouter.get(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new AppError("회원을 찾을 수 없습니다.", 404);

    const currentWeek = await getCurrentWeek();
    const weeklySummary = await calculateWeeklySummary(userId, currentWeek.id);

    const recentDaily = await db.query.trainingRecords.findMany({
      where: eq(trainingRecords.userId, userId),
      orderBy: [asc(trainingRecords.recordDate)],
      limit: 60,
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, status: user.status },
      weeklySummary,
      recentDaily,
    });
  })
);

const statusSchema = z.object({ status: z.enum(["active", "inactive"]) });

adminRouter.patch(
  "/members/:id/status",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { status } = statusSchema.parse(req.body);
    await db.update(users).set({ status }).where(eq(users.id, userId));
    res.json({ ok: true });
  })
);

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

adminRouter.patch(
  "/members/:id/password",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { newPassword } = passwordResetSchema.parse(req.body);

    const member = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!member) throw new AppError("회원을 찾을 수 없습니다.", 404);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// 주차 관리
// ---------------------------------------------------------------------------
adminRouter.get(
  "/weeks",
  asyncHandler(async (req, res) => {
    const allWeeks = await db.query.weeks.findMany({ orderBy: [asc(weeks.weekNumber)] });
    res.json({ weeks: allWeeks });
  })
);

const createWeekSchema = z.object({
  weekStart: z.string(), // YYYY-MM-DD (월요일)
});

adminRouter.post(
  "/weeks",
  asyncHandler(async (req, res) => {
    const { weekStart } = createWeekSchema.parse(req.body);
    const week = await getOrCreateWeekForDate(new Date(`${weekStart}T00:00:00`));
    res.json({ week });
  })
);

// ---------------------------------------------------------------------------
// 암송 구절 관리
// ---------------------------------------------------------------------------
const passageQuerySchema = z.object({ weekId: z.coerce.number().int().optional() });

adminRouter.get(
  "/memorization/passages",
  asyncHandler(async (req, res) => {
    const { weekId } = passageQuerySchema.parse(req.query);
    const passages = await db.query.memorizationPassages.findMany({
      where: weekId ? eq(memorizationPassages.weekId, weekId) : undefined,
      orderBy: [asc(memorizationPassages.weekId), asc(memorizationPassages.displayOrder)],
    });
    res.json({ passages });
  })
);

const passageCreateSchema = z.object({
  weekId: z.number().int(),
  book: z.string().min(1),
  chapterVerse: z.string().min(1),
  content: z.string().min(1),
  displayOrder: z.number().int().default(0),
});

adminRouter.post(
  "/memorization/passages",
  asyncHandler(async (req, res) => {
    const body = passageCreateSchema.parse(req.body);
    await db.insert(memorizationPassages).values(body);
    res.json({ ok: true });
  })
);

const passageUpdateSchema = passageCreateSchema.partial();

adminRouter.put(
  "/memorization/passages/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = passageUpdateSchema.parse(req.body);
    await db.update(memorizationPassages).set(body).where(eq(memorizationPassages.id, id));
    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/memorization/passages/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(memorizationPassages).where(eq(memorizationPassages.id, id));
    res.json({ ok: true });
  })
);

const reorderSchema = z.array(z.object({ id: z.number().int(), displayOrder: z.number().int() }));

adminRouter.patch(
  "/memorization/passages/reorder",
  asyncHandler(async (req, res) => {
    const items = reorderSchema.parse(req.body);
    await Promise.all(
      items.map((item) =>
        db.update(memorizationPassages).set({ displayOrder: item.displayOrder }).where(eq(memorizationPassages.id, item.id))
      )
    );
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// 통계
// ---------------------------------------------------------------------------
adminRouter.get(
  "/statistics",
  asyncHandler(async (req, res) => {
    const allMembers = await db.query.users.findMany({ where: eq(users.role, "member") });
    const currentWeek = await getCurrentWeek();

    const summaries = await Promise.all(
      allMembers.map((m) => calculateWeeklySummary(m.id, currentWeek.id))
    );

    const averageProgress =
      summaries.length > 0
        ? Math.round((summaries.reduce((sum, s) => sum + s.overallProgress, 0) / summaries.length) * 10) / 10
        : 0;

    res.json({
      totalMembers: allMembers.length,
      activeMembers: allMembers.filter((m) => m.status === "active").length,
      currentWeekAverageProgress: averageProgress,
    });
  })
);
