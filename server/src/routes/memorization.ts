import { Router } from "express";
import { z } from "zod";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  memorizationPassages,
  memorizationResults,
  memorizationTestSessions,
  weeks,
} from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { getCurrentWeek, getWeekById } from "../services/weeks.js";
import { diffMemorization, scoreFillBlank, scoreFromDiff } from "../services/memorizationDiff.js";
import { getSettings } from "../services/settings.js";

export const memorizationRouter = Router();
memorizationRouter.use(requireAuth);

// 빈칸 암송 UI 구성에 필요한 전역 설정 (몇 단어마다 빈칸을 만들지)
memorizationRouter.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    res.json({ blankInterval: settings.blankInterval });
  })
);

/** scopeWeekId까지(누적) 등록된 구절 목록을 순서대로 반환 */
async function getPassagesUpToWeek(scopeWeekId: number) {
  const scopeWeek = await getWeekById(scopeWeekId);
  const weeksUpTo = await db.query.weeks.findMany({
    where: lte(weeks.weekNumber, scopeWeek.weekNumber),
  });
  const weekIds = weeksUpTo.map((w) => w.id);
  if (weekIds.length === 0) return [];

  return db.query.memorizationPassages.findMany({
    where: inArray(memorizationPassages.weekId, weekIds),
    orderBy: [asc(memorizationPassages.weekId), asc(memorizationPassages.displayOrder)],
  });
}

// 주차 목록 + 각 주차까지의 누적 구절 수 (문서 18번 Step 1 UI용)
memorizationRouter.get(
  "/weeks",
  asyncHandler(async (req, res) => {
    const allWeeks = await db.query.weeks.findMany({ orderBy: [asc(weeks.weekNumber)] });
    const currentWeek = await getCurrentWeek();

    const result = await Promise.all(
      allWeeks.map(async (w) => {
        const passages = await getPassagesUpToWeek(w.id);
        return {
          id: w.id,
          weekNumber: w.weekNumber,
          weekStart: w.weekStart,
          cumulativePassageCount: passages.length,
        };
      })
    );

    res.json({ weeks: result, currentWeekId: currentWeek.id });
  })
);

const passagesQuerySchema = z.object({
  uptoWeekId: z.coerce.number().int(),
});

memorizationRouter.get(
  "/passages",
  asyncHandler(async (req, res) => {
    const { uptoWeekId } = passagesQuerySchema.parse(req.query);
    const passages = await getPassagesUpToWeek(uptoWeekId);
    res.json({ passages });
  })
);

const createSessionSchema = z.object({
  scopeWeekId: z.number().int(),
  testType: z.enum(["full_recite", "fill_blank", "full_input"]),
});

memorizationRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const { scopeWeekId, testType } = createSessionSchema.parse(req.body);

    // 이미 진행 중인 세션이 있으면 그것을 재사용 (이탈 후 재접속 시나리오, 문서 32번)
    const inProgress = await db.query.memorizationTestSessions.findFirst({
      where: and(
        eq(memorizationTestSessions.userId, req.user!.userId),
        eq(memorizationTestSessions.status, "in_progress")
      ),
    });
    if (inProgress) {
      return res.json({ session: inProgress, resumed: true });
    }

    const passages = await getPassagesUpToWeek(scopeWeekId);
    if (passages.length === 0) {
      throw new AppError("해당 범위에 등록된 암송 구절이 없습니다.", 400);
    }

    await db.insert(memorizationTestSessions).values({
      userId: req.user!.userId,
      scopeWeekId,
      testType,
      totalPassages: passages.length,
    });

    const session = await db.query.memorizationTestSessions.findFirst({
      where: and(
        eq(memorizationTestSessions.userId, req.user!.userId),
        eq(memorizationTestSessions.status, "in_progress")
      ),
    });

    res.json({ session, resumed: false });
  })
);

async function loadSessionOrThrow(sessionId: number, userId: number) {
  const session = await db.query.memorizationTestSessions.findFirst({
    where: and(eq(memorizationTestSessions.id, sessionId), eq(memorizationTestSessions.userId, userId)),
  });
  if (!session) throw new AppError("테스트 세션을 찾을 수 없습니다.", 404);
  return session;
}

memorizationRouter.get(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const session = await loadSessionOrThrow(Number(req.params.id), req.user!.userId);
    const passages = await getPassagesUpToWeek(session.scopeWeekId);
    const results = await db.query.memorizationResults.findMany({
      where: eq(memorizationResults.sessionId, session.id),
    });
    res.json({ session, passages, results });
  })
);

const submitResultSchema = z.object({
  passageId: z.number().int(),
  // full_recite: 아무 값도 없이 완료만 표시
  // full_input: userInput 전체 문장
  userInput: z.string().optional(),
  // fill_blank: 정답 배열(blanks)과 사용자가 입력한 배열(answers)을 함께 전달
  blanks: z.array(z.string()).optional(),
  answers: z.array(z.string()).optional(),
});

memorizationRouter.post(
  "/sessions/:id/results",
  asyncHandler(async (req, res) => {
    const session = await loadSessionOrThrow(Number(req.params.id), req.user!.userId);
    if (session.status !== "in_progress") {
      throw new AppError("이미 종료된 세션입니다.", 400);
    }

    const body = submitResultSchema.parse(req.body);
    const passage = await db.query.memorizationPassages.findFirst({
      where: eq(memorizationPassages.id, body.passageId),
    });
    if (!passage) throw new AppError("구절을 찾을 수 없습니다.", 404);

    let score: number | null = null;
    let correctCount = 0;
    let wrongCount = 0;
    let missingCount = 0;
    let snapshot: Record<string, unknown> = {};

    if (session.testType === "full_recite") {
      score = null; // 채점하지 않음, 완료 처리만
    } else if (session.testType === "full_input") {
      const userInput = body.userInput ?? "";
      const diff = diffMemorization(passage.content, userInput);
      const scored = scoreFromDiff(diff);
      score = scored.score;
      correctCount = scored.correctCount;
      wrongCount = scored.wrongCount;
      missingCount = scored.missingCount;
      snapshot = { userInput, diff };
    } else if (session.testType === "fill_blank") {
      const blanks = body.blanks ?? [];
      const answers = body.answers ?? [];
      const scored = scoreFillBlank(blanks, answers);
      score = scored.score;
      correctCount = scored.correctCount;
      wrongCount = scored.wrongCount;
      missingCount = scored.missingCount;
      snapshot = { blanks, answers };
    }

    const existing = await db.query.memorizationResults.findFirst({
      where: and(eq(memorizationResults.sessionId, session.id), eq(memorizationResults.passageId, passage.id)),
    });

    const values = {
      score: score === null ? null : String(score),
      correctCount,
      wrongCount,
      missingCount,
      testSnapshot: snapshot,
      completedAt: new Date(),
    };

    if (existing) {
      await db.update(memorizationResults).set(values).where(eq(memorizationResults.id, existing.id));
    } else {
      await db.insert(memorizationResults).values({
        sessionId: session.id,
        passageId: passage.id,
        ...values,
      });
    }

    res.json({ score, correctCount, wrongCount, missingCount, diffOrSnapshot: snapshot });
  })
);

memorizationRouter.post(
  "/sessions/:id/complete",
  asyncHandler(async (req, res) => {
    const session = await loadSessionOrThrow(Number(req.params.id), req.user!.userId);
    const results = await db.query.memorizationResults.findMany({
      where: eq(memorizationResults.sessionId, session.id),
    });

    const scored = results.filter((r) => r.score !== null).map((r) => Number(r.score));
    const averageScore =
      scored.length > 0 ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null;

    await db
      .update(memorizationTestSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        averageScore: averageScore === null ? null : String(averageScore),
      })
      .where(eq(memorizationTestSessions.id, session.id));

    const needsReview = results.filter((r) => r.wrongCount > 0 || r.missingCount > 0).length;

    res.json({
      totalPassages: session.totalPassages,
      averageScore,
      correctPassages: results.length - needsReview,
      needsReviewPassages: needsReview,
    });
  })
);

const historyQuerySchema = z.object({
  status: z.enum(["in_progress", "completed"]).optional(),
});

memorizationRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const { status } = historyQuerySchema.parse(req.query);
    const sessions = await db.query.memorizationTestSessions.findMany({
      where: status
        ? and(eq(memorizationTestSessions.userId, req.user!.userId), eq(memorizationTestSessions.status, status))
        : eq(memorizationTestSessions.userId, req.user!.userId),
    });
    res.json({ sessions });
  })
);
