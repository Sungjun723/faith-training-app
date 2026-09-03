import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const t = getTransporter();

  if (!t) {
    // SMTP 미설정 상태 (로컬 개발 등) — 실제 발송 대신 콘솔에 링크를 출력한다.
    console.warn(
      `[mailer] SMTP가 설정되지 않아 이메일을 보내지 않았습니다. 비밀번호 재설정 링크: ${resetUrl}`
    );
    return;
  }

  await t.sendMail({
    from: env.smtpFrom,
    to,
    subject: "[신앙훈련 노트] 비밀번호 재설정 안내",
    text: `아래 링크에서 비밀번호를 재설정해주세요 (${env.passwordResetTokenExpiryMinutes}분 이내 유효):\n\n${resetUrl}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.`,
    html: `
      <p>안녕하세요,</p>
      <p>아래 버튼을 눌러 비밀번호를 재설정해주세요. 이 링크는 ${env.passwordResetTokenExpiryMinutes}분 동안만 유효합니다.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2f5d62;color:#fff;border-radius:8px;text-decoration:none;">비밀번호 재설정</a></p>
      <p>버튼이 동작하지 않으면 아래 링크를 브라우저에 붙여넣어 주세요:<br/>${resetUrl}</p>
      <p style="color:#888;font-size:12px;">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
    `,
  });
}
