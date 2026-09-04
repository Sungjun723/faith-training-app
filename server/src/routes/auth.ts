import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { signToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME, requireAuth } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

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
