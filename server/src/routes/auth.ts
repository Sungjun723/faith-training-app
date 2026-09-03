import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, passwordResetTokens } from "../db/schema.js";
import { signToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME, requireAuth } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";
import { generateResetToken, hashToken } from "../utils/token.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_MAX_AGE_MS = env.jwtExpiresInDays * 24 * 60 * 60 * 1000;

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || user.status === "inactive") {
      throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

authRouter.post("/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
    if (!user) throw new AppError("사용자를 찾을 수 없습니다.", 404);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 비밀번호 재설정 (이메일)
// ---------------------------------------------------------------------------
const requestResetSchema = z.object({ email: z.string().email() });

authRouter.post(
  "/request-password-reset",
  asyncHandler(async (req, res) => {
    const { email } = requestResetSchema.parse(req.body);

    // 보안: 해당 이메일이 실제로 존재하는지 여부를 응답으로 노출하지 않는다.
    const genericResponse = {
      ok: true,
      message: "입력하신 이메일로 가입된 계정이 있다면 재설정 링크를 보내드렸습니다.",
    };

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || user.status === "inactive") {
      return res.json(genericResponse);
    }

    const token = generateResetToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + env.passwordResetTokenExpiryMinutes * 60 * 1000);

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${env.appBaseUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(genericResponse);
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const record = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!record) {
      throw new AppError("유효하지 않거나 만료된 링크입니다. 다시 요청해주세요.", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    res.json({ ok: true });
  })
);
