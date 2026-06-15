// 시간/날짜 변환 유틸 — 여러 컴포넌트에 복붙되어 있던 함수들을 단일 출처로 모은 모듈.
// 모든 "HH:MM"은 24시간 표기, 날짜는 "YYYY-MM-DD" 로컬 기준이다.

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "HH:MM" → 자정 기준 분. 분이 없으면 0으로 본다. (클램프하지 않음) */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 분 → "HH:MM". 표시용으로 0~1440 범위로 클램프한다. */
export function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(1440, m));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(
    clamped % 60
  ).padStart(2, "0")}`;
}

/** 시작~종료(포함) 사이의 모든 날짜를 "YYYY-MM-DD" 배열로 반환. */
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (current <= last) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** "YYYY-MM-DD" → 타임라인 헤더용 분해값. */
export function formatDateShort(dateStr: string): {
  day: string;
  weekday: string;
  monthDay: string;
} {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: String(d.getDate()),
    weekday: WEEKDAYS[d.getDay()],
    monthDay: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

/** "YYYY-MM-DD" → "M월 D일 (요일)". */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

/** "YYYY-MM-DD" → "M/D 요일". */
export function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
}
