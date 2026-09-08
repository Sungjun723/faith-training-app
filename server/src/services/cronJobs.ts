import cron from "node-cron";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { dailyMeditations } from "../db/schema.js";
import { crawlAndSaveMeditation } from "./meditationCrawler.js";
import { toDateString } from "../utils/date.js";

/** 매일 오전 1시(KST)에 그날의 "한 구절 묵상"을 크롤링해 저장한다. */
export function registerCronJobs() {
  cron.schedule(
    "0 1 * * *",
    async () => {
      try {
        const meditation = await crawlAndSaveMeditation();
        console.log(`[cron] 한 구절 묵상 크롤링 완료 (${meditation.date})`);
      } catch (err) {
        console.error("[cron] 한 구절 묵상 크롤링 실패", err);
      }
    },
    { timezone: "Asia/Seoul" }
  );

  // 서버가 재배포/재시작되어 오늘 글이 아직 없으면(예: 자정~오전 1시 사이 재시작),
  // 다음 새벽 1시까지 기다리지 않고 바로 한 번 채워둔다.
  void ensureTodayMeditation();
}

async function ensureTodayMeditation() {
  try {
    const today = toDateString(new Date());
    const existing = await db.query.dailyMeditations.findFirst({ where: eq(dailyMeditations.date, today) });
    if (!existing) {
      await crawlAndSaveMeditation();
      console.log(`[cron] 시작 시 오늘(${today}) 한 구절 묵상이 없어 즉시 크롤링했습니다.`);
    }
  } catch (err) {
    console.error("[cron] 시작 시 한 구절 묵상 확인/크롤링 실패", err);
  }
}
