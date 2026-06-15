// 시간 구간 겹침 판정 — 여러 컴포넌트에 서로 다르게 구현돼 있던 겹침 로직을 단일 출처로 모은 모듈.
import { minutesToTime } from "./time";
import type { TimeBlock } from "./types";

/** 분 단위 두 구간 [aStart,aEnd), [bStart,bEnd)이 겹치면 true (경계 접촉은 겹침 아님). */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** 두 구간의 겹치는 분. 겹치지 않으면 0 이하(음수)가 될 수 있다. */
export function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
}

/** 같은 날짜의 두 TimeBlock이 겹치는지 ("HH:MM" 문자열 비교, 경계 접촉은 겹침 아님). */
export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.date === b.date && a.start_time < b.end_time && a.end_time > b.start_time;
}

/** [startMin,endMin] 구간이 같은 날짜의 available 블록 중 하나에 완전히 포함되는지. */
export function isRangeWithinAvailable(
  date: string,
  startMin: number,
  endMin: number,
  available: TimeBlock[]
): boolean {
  const s = minutesToTime(startMin);
  const e = minutesToTime(endMin);
  return available.some(
    (a) => a.date === date && s >= a.start_time && e <= a.end_time
  );
}
