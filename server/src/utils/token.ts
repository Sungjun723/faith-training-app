import crypto from "node:crypto";

/** 이메일로 보낼 평문 토큰 (URL-safe) */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** DB에는 평문 토큰을 저장하지 않고 해시만 저장한다. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
