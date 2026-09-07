import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  users,
  groups,
  memorizationPassages,
  memorizationTestSessions,
  memorizationResults,
  trainingRecords,
  weeklyTrainingRecords,
  announcements,
} from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { getCurrentWeekForUser } from "../services/groupWeeks.js";
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
// 그룹 관리 (시작일을 공유하는 학생 단위)
// ---------------------------------------------------------------------------
adminRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const allGroups = await db.query.groups.findMany({ orderBy: [asc(groups.startDate)] });
    const memberCounts = await db
      .select({ groupId: users.groupId, count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "member"))
      .groupBy(users.groupId);
    const countMap = new Map(memberCounts.map((r) => [r.groupId, Number(r.count)]));

    res.json({
      groups: allGroups.map((g) => ({ ...g, memberCount: countMap.get(g.id) ?? 0 })),
    });
  })
);

const groupCreateSchema = z.object({
  name: z.string().min(1, "그룹 이름을 입력해주세요."),
  startDate: z.string().min(1, "시작일을 선택해주세요."), // YYYY-MM-DD
});

adminRouter.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const { name, startDate } = groupCreateSchema.parse(req.body);
    const existing = await db.query.groups.findFirst({ where: eq(groups.name, name) });
    if (existing) throw new AppError("이미 존재하는 그룹 이름입니다.", 400);

    await db.insert(groups).values({ name, startDate });
    const created = await db.query.groups.findFirst({ where: eq(groups.name, name) });
    res.json({ group: created });
  })
);

const groupUpdateSchema = groupCreateSchema.partial();

adminRouter.put(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = groupUpdateSchema.parse(req.body);
    await db.update(groups).set(body).where(eq(groups.id, id));
    const updated = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    res.json({ group: updated });
  })
);

adminRouter.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const memberCount = await db.query.users.findFirst({ where: eq(users.groupId, id) });
    if (memberCount) {
      throw new AppError("이 그룹에 속한 회원이 있어 삭제할 수 없습니다. 먼저 회원을 다른 그룹으로 옮겨주세요.", 400);
    }
    await db.delete(groups).where(eq(groups.id, id));
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// 회원 관리
// ---------------------------------------------------------------------------
const createMemberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  email: z.string().email(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  role: z.enum(["member", "admin"]).default("member"),
  groupId: z.number().int().nullable().optional(),
});

adminRouter.post(
  "/members",
  asyncHandler(async (req, res) => {
    const { name, email, password, role, groupId } = createMemberSchema.parse(req.body);

    if (role === "member" && !groupId) {
      throw new AppError("일반 회원은 그룹을 반드시 선택해야 합니다.", 400);
    }
    if (groupId) {
      const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
      if (!group) throw new AppError("존재하지 않는 그룹입니다.", 400);
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      throw new AppError("이미 사용 중인 이메일입니다.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({ name, email, passwordHash, role, groupId: groupId ?? null, status: "active" });

    const created = await db.query.users.findFirst({ where: eq(users.email, email) });
    res.json({
      user: { id: created!.id, name: created!.name, email: created!.email, role: created!.role },
    });
  })
);

adminRouter.get(
  "/members",
  asyncHandler(async (req, res) => {
    const allUsers = await db.query.users.findMany({ orderBy: [asc(users.name)] });
    const allGroups = await db.query.groups.findMany();
    const groupNameById = new Map(allGroups.map((g) => [g.id, g.name]));

    const withProgress = await Promise.all(
      allUsers
        .filter((u) => u.role === "member")
        .map(async (u) => {
          let thisWeekProgress = 0;
          if (u.groupId) {
            try {
              const currentWeek = await getCurrentWeekForUser(u.id);
              const summary = await calculateWeeklySummary(u.id, currentWeek.weekNumber);
              thisWeekProgress = summary.overallProgress;
            } catch {
              thisWeekProgress = 0;
            }
          }
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            status: u.status,
            groupId: u.groupId,
            groupName: u.groupId ? groupNameById.get(u.groupId) ?? null : null,
            thisWeekProgress,
          };
        })
    );

    res.json({ members: withProgress });
  })
);

adminRouter.get(
  "/admins",
  asyncHandler(async (req, res) => {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
      orderBy: [asc(users.name)],
    });
    res.json({
      admins: admins.map((a) => ({ id: a.id, name: a.name, email: a.email })),
    });
  })
);

adminRouter.get(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new AppError("회원을 찾을 수 없습니다.", 404);

    const group = user.groupId ? await db.query.groups.findFirst({ where: eq(groups.id, user.groupId) }) : null;

    let weeklySummary = null;
    if (user.groupId) {
      const currentWeek = await getCurrentWeekForUser(userId);
      weeklySummary = await calculateWeeklySummary(userId, currentWeek.weekNumber);
    }

    const recentDaily = await db.query.trainingRecords.findMany({
      where: eq(trainingRecords.userId, userId),
      orderBy: [asc(trainingRecords.recordDate)],
      limit: 60,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        groupId: user.groupId,
        groupName: group?.name ?? null,
      },
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

const groupAssignSchema = z.object({ groupId: z.number().int() });

adminRouter.patch(
  "/members/:id/group",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { groupId } = groupAssignSchema.parse(req.body);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) throw new AppError("존재하지 않는 그룹입니다.", 400);

    await db.update(users).set({ groupId }).where(eq(users.id, userId));
    res.json({ ok: true });
  })
);

const roleChangeSchema = z.object({
  role: z.enum(["member", "admin"]),
  groupId: z.number().int().nullable().optional(),
});

adminRouter.patch(
  "/members/:id/role",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    if (userId === req.user!.userId) {
      throw new AppError("자기 자신의 권한은 변경할 수 없습니다.", 400);
    }
    const { role, groupId } = roleChangeSchema.parse(req.body);
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) throw new AppError("회원을 찾을 수 없습니다.", 404);

    if (role === "admin") {
      await db.update(users).set({ role: "admin", groupId: null }).where(eq(users.id, userId));
    } else {
      if (!groupId) {
        throw new AppError("일반 회원은 그룹을 반드시 선택해야 합니다.", 400);
      }
      const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
      if (!group) throw new AppError("존재하지 않는 그룹입니다.", 400);
      await db.update(users).set({ role: "member", groupId }).where(eq(users.id, userId));
    }

    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/members/:id",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    if (userId === req.user!.userId) {
      throw new AppError("자기 자신은 삭제할 수 없습니다.", 400);
    }
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) throw new AppError("회원을 찾을 수 없습니다.", 404);
    if (target.role === "admin") {
      throw new AppError("관리자 계정은 삭제할 수 없습니다. 먼저 일반 회원으로 전환해주세요.", 400);
    }

    await db.transaction(async (tx) => {
      const sessions = await tx.query.memorizationTestSessions.findMany({
        where: eq(memorizationTestSessions.userId, userId),
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await tx.delete(memorizationResults).where(inArray(memorizationResults.sessionId, sessionIds));
        await tx.delete(memorizationTestSessions).where(eq(memorizationTestSessions.userId, userId));
      }
      await tx.delete(weeklyTrainingRecords).where(eq(weeklyTrainingRecords.userId, userId));
      await tx.delete(trainingRecords).where(eq(trainingRecords.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// 암송 구절 관리 (주차 번호로만 관리, 그룹과 무관)
// ---------------------------------------------------------------------------
adminRouter.get(
  "/memorization/weeks",
  asyncHandler(async (req, res) => {
    const rows = await db
      .selectDistinct({ weekNumber: memorizationPassages.weekNumber })
      .from(memorizationPassages)
      .orderBy(asc(memorizationPassages.weekNumber));
    res.json({ weekNumbers: rows.map((r) => r.weekNumber) });
  })
);

const passageQuerySchema = z.object({ weekNumber: z.coerce.number().int().optional() });

adminRouter.get(
  "/memorization/passages",
  asyncHandler(async (req, res) => {
    const { weekNumber } = passageQuerySchema.parse(req.query);
    const passages = await db.query.memorizationPassages.findMany({
      where: weekNumber ? eq(memorizationPassages.weekNumber, weekNumber) : undefined,
      orderBy: [asc(memorizationPassages.weekNumber), asc(memorizationPassages.displayOrder)],
    });
    res.json({ passages });
  })
);

const passageCreateSchema = z.object({
  weekNumber: z.number().int().min(1),
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
    const membersWithGroup = allMembers.filter((m) => m.groupId);

    const summaries = await Promise.all(
      membersWithGroup.map(async (m) => {
        const currentWeek = await getCurrentWeekForUser(m.id);
        return calculateWeeklySummary(m.id, currentWeek.weekNumber);
      })
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

// 주차별(1주차, 2주차 ...) 통계 — 그룹마다 실제 날짜는 달라도 weekNumber는 그룹 간
// 비교 가능한 상대 지표이므로 weekNumber 기준으로 묶어서 집계한다. 아직 그 주차에
// 도달하지 않은 회원(currentWeek < weekNumber)은 해당 주차 집계에서 제외한다.
adminRouter.get(
  "/statistics/weekly",
  asyncHandler(async (req, res) => {
    const allMembers = await db.query.users.findMany({ where: eq(users.role, "member") });
    const membersWithGroup = allMembers.filter((m) => m.groupId);

    const currentWeeks = await Promise.all(
      membersWithGroup.map(async (m) => ({
        member: m,
        currentWeek: (await getCurrentWeekForUser(m.id)).weekNumber,
      }))
    );
    const maxWeek = currentWeeks.reduce((max, c) => Math.max(max, c.currentWeek), 0);

    const weeks = [];
    for (let weekNumber = 1; weekNumber <= maxWeek; weekNumber++) {
      const eligible = currentWeeks.filter((c) => c.currentWeek >= weekNumber);
      const memberProgress = await Promise.all(
        eligible.map(async ({ member }) => {
          const summary = await calculateWeeklySummary(member.id, weekNumber);
          return { id: member.id, name: member.name, progress: summary.overallProgress };
        })
      );
      const averageProgress =
        memberProgress.length > 0
          ? Math.round((memberProgress.reduce((sum, m) => sum + m.progress, 0) / memberProgress.length) * 10) / 10
          : 0;
      weeks.push({ weekNumber, averageProgress, members: memberProgress });
    }

    res.json({ weeks });
  })
);

// ---------------------------------------------------------------------------
// 공지사항 관리 (활성 상태인 것만 회원 홈에 노출 — GET /api/announcements/active 참고)
// ---------------------------------------------------------------------------
adminRouter.get(
  "/announcements",
  asyncHandler(async (req, res) => {
    const rows = await db.query.announcements.findMany({ orderBy: [desc(announcements.createdAt)] });
    res.json({ announcements: rows });
  })
);

const announcementCreateSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  content: z.string().min(1, "내용을 입력해주세요."),
});

adminRouter.post(
  "/announcements",
  asyncHandler(async (req, res) => {
    const body = announcementCreateSchema.parse(req.body);
    await db.insert(announcements).values({ ...body, createdBy: req.user!.userId });
    res.json({ ok: true });
  })
);

const announcementUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

adminRouter.put(
  "/announcements/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = announcementUpdateSchema.parse(req.body);
    await db.update(announcements).set(body).where(eq(announcements.id, id));
    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/announcements/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(announcements).where(eq(announcements.id, id));
    res.json({ ok: true });
  })
);
