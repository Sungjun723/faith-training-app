import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { dailyMeditations } from "../db/schema.js";
import { toDateString } from "../utils/date.js";

const SOURCE_URL = "https://www.woorichurch.org/modu/ov/ov_meditation.asp";

function parseSiteDate(text: string): string | null {
  // 사이트 표기: "2026.09.08(화)"
  const m = text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export interface CrawledMeditation {
  date: string;
  title: string;
  verse: string;
  content: string;
}

/** woorichurch.org "한 구절 묵상" 페이지를 파싱한다.
 *  dateStr을 주면 그 날짜(`?ov_date=`)의 글을, 안 주면 사이트 기본값(오늘)을 가져온다. */
export async function fetchMeditationFromSite(dateStr?: string): Promise<CrawledMeditation> {
  const url = dateStr ? `${SOURCE_URL}?ov_date=${dateStr}` : SOURCE_URL;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`한 구절 묵상 페이지를 가져오지 못했습니다. (HTTP ${res.status})`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // 페이지 하단에 지난 글 목록도 class="sbj"로 나오므로(onclick 속성 있음),
  // onclick이 없는(=본문 상단) 것만 오늘 글의 제목으로 취급한다.
  const title = $("p.sbj").not("[onclick]").first().text().trim();
  const date = parseSiteDate($("p.date").first().text().trim());

  // class="word"가 "오늘의 본문 : ..."과 "오늘의 한 구절 : ..." 두 개 나오는데,
  // 요청한 "한 구절"은 후자다.
  let verse = "";
  const wordEls = $("p.word");
  wordEls.each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes("한 구절")) verse = text;
  });
  if (!verse && wordEls.length > 0) verse = $(wordEls[wordEls.length - 1]).text().trim();

  // class="qt_cont" 안의 각 section(본문 개요/오늘의 한 구절/한 구절 묵상/묵상질문/기도)을
  // "소제목\n본문" 블록으로 이어붙인다.
  const sections: string[] = [];
  $(".qt_cont .qt_cont_sec").each((_, section) => {
    const sectionTitle = $(section).find("h4.tit").first().text().trim();
    const body = $(section).find("div.cont").first();
    body.find("br").replaceWith("\n");
    const bodyText = body.text().replace(/\t/g, "").trim();
    if (sectionTitle && bodyText) sections.push(`${sectionTitle}\n${bodyText}`);
  });
  const content = sections.join("\n\n").trim();

  if (!title || !date || !content) {
    throw new Error("한 구절 묵상 페이지 구조가 예상과 달라 내용을 읽지 못했습니다.");
  }

  return { date, title, verse, content };
}

/** dateStr(기본: 오늘)의 글을 크롤링해 DB에 upsert 한다. */
export async function crawlAndSaveMeditation(dateStr: string = toDateString(new Date())): Promise<CrawledMeditation> {
  const today = toDateString(new Date());
  const parsed = await fetchMeditationFromSite(dateStr === today ? undefined : dateStr);

  const existing = await db.query.dailyMeditations.findFirst({
    where: eq(dailyMeditations.date, parsed.date),
  });
  if (existing) {
    await db
      .update(dailyMeditations)
      .set({ title: parsed.title, verse: parsed.verse, content: parsed.content })
      .where(eq(dailyMeditations.id, existing.id));
  } else {
    await db.insert(dailyMeditations).values(parsed);
  }

  return parsed;
}
