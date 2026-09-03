export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSunday(dateStr: string): boolean {
  return new Date(`${dateStr}T00:00:00`).getDay() === 0;
}

const WEEKDAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"];
export function weekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS_KO[new Date(`${dateStr}T00:00:00`).getDay()];
}

export function formatKoreanDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
