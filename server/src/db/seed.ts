import bcrypt from "bcryptjs";
import { db, pool } from "./client.js";
import { users, memorizationPassages } from "./schema.js";
import { getCurrentWeek } from "../services/weeks.js";
import { eq } from "drizzle-orm";

async function run() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      name: "관리자",
      email: adminEmail,
      passwordHash,
      role: "admin",
      status: "active",
    });
    console.log(`관리자 계정 생성: ${adminEmail} / ${adminPassword} (배포 후 반드시 비밀번호 변경)`);
  } else {
    console.log("관리자 계정이 이미 존재합니다. 건너뜁니다.");
  }

  const week1 = await getCurrentWeek();
  const existingPassages = await db.query.memorizationPassages.findMany({
    where: eq(memorizationPassages.weekId, week1.id),
  });
  if (existingPassages.length === 0) {
    await db.insert(memorizationPassages).values([
      {
        weekId: week1.id,
        book: "요한복음",
        chapterVerse: "3:16",
        content:
          "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라.",
        displayOrder: 1,
      },
      {
        weekId: week1.id,
        book: "시편",
        chapterVerse: "23:1",
        content: "여호와는 나의 목자시니 내게 부족함이 없으리로다.",
        displayOrder: 2,
      },
    ]);
    console.log("1주차 샘플 암송 구절 생성 완료.");
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
