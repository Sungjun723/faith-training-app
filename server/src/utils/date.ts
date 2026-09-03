/** YYYY-MM-DD 문자열로 포맷 (UTC 아님, local date 기준) */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 주어진 날짜가 속한 주의 월요일을 반환 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=일,1=월,...6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6); // 월요일 + 6 = 일요일
  return d;
}

export function isSunday(dateStr: string): boolean {
  // dateStr: YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getDay() === 0;
}
