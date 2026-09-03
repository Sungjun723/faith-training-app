import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appSettings } from "../db/schema.js";

export async function getSettings() {
  const existing = await db.query.appSettings.findFirst();
  if (existing) return existing;

  await db.insert(appSettings).values({ blankInterval: 3 });
  const created = await db.query.appSettings.findFirst();
  if (!created) throw new Error("설정 생성에 실패했습니다.");
  return created;
}

export async function updateBlankInterval(interval: number) {
  const settings = await getSettings();
  await db.update(appSettings).set({ blankInterval: interval }).where(eq(appSettings.id, settings.id));
  return getSettings();
}
