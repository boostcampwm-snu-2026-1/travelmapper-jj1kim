// 확정 이벤트 시간 검증 — 클라이언트뿐 아니라 서버(API 직접 호출·경쟁 요청)에서도 강제한다.
import { timeToMinutes } from "./time";
import { rangesOverlap } from "./overlap";

/** "HH:MM" 형식이며 00:00~24:00(자정) 범위인지. (24:00은 자정 종료로 허용) */
export function isValidTime(t: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return false;
  const minutes = Number(m[2]);
  if (minutes > 59) return false;
  const total = Number(m[1]) * 60 + minutes;
  return total >= 0 && total <= 1440;
}

export interface EventTimingInput {
  date: string;
  start_time: string;
  end_time: string;
}

export interface ExistingEvent {
  date: string;
  start_time: string;
  end_time: string;
}

export interface TimingContext {
  tripStart?: string | null;
  tripEnd?: string | null;
  existing?: ExistingEvent[];
}

export type TimingError = "format" | "order" | "range" | "overlap";

/** 통과하면 null, 위반하면 사유 코드를 반환한다. */
export function validateEventTiming(
  input: EventTimingInput,
  ctx: TimingContext = {}
): TimingError | null {
  if (!isValidTime(input.start_time) || !isValidTime(input.end_time)) {
    return "format";
  }
  const start = timeToMinutes(input.start_time);
  const end = timeToMinutes(input.end_time);
  if (start >= end) return "order";

  if (ctx.tripStart && ctx.tripEnd) {
    if (input.date < ctx.tripStart || input.date > ctx.tripEnd) return "range";
  }

  for (const ev of ctx.existing ?? []) {
    if (ev.date !== input.date) continue;
    if (rangesOverlap(start, end, timeToMinutes(ev.start_time), timeToMinutes(ev.end_time))) {
      return "overlap";
    }
  }
  return null;
}

export const TIMING_ERROR_MESSAGE: Record<TimingError, string> = {
  format: "시간 형식이 올바르지 않습니다.",
  order: "종료 시각은 시작 시각보다 늦어야 합니다.",
  range: "여행 기간을 벗어난 날짜입니다.",
  overlap: "이미 일정이 있는 시간과 겹칩니다.",
};
