import { describe, it, expect } from "vitest";
import {
  rangesOverlap,
  overlapMinutes,
  blocksOverlap,
  isRangeWithinAvailable,
} from "./overlap";
import type { TimeBlock } from "./types";

describe("rangesOverlap", () => {
  it("겹치는 구간은 true", () => {
    expect(rangesOverlap(540, 600, 570, 630)).toBe(true);
  });
  it("경계가 맞닿기만 하면 겹침이 아니다", () => {
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false);
    expect(rangesOverlap(600, 660, 540, 600)).toBe(false);
  });
  it("완전히 떨어진 구간은 false", () => {
    expect(rangesOverlap(540, 600, 700, 760)).toBe(false);
  });
  it("한 구간이 다른 구간을 포함하면 true", () => {
    expect(rangesOverlap(540, 720, 600, 660)).toBe(true);
  });
});

describe("overlapMinutes", () => {
  it("겹치는 분을 반환한다", () => {
    expect(overlapMinutes(540, 600, 570, 630)).toBe(30);
  });
  it("겹치지 않으면 음수가 될 수 있다", () => {
    expect(overlapMinutes(540, 600, 660, 720)).toBeLessThan(0);
  });
  it("경계 접촉은 0", () => {
    expect(overlapMinutes(540, 600, 600, 660)).toBe(0);
  });
});

describe("blocksOverlap", () => {
  const base: TimeBlock = { date: "2026-06-15", start_time: "09:00", end_time: "10:00" };
  it("같은 날짜에 겹치면 true", () => {
    expect(blocksOverlap(base, { date: "2026-06-15", start_time: "09:30", end_time: "11:00" })).toBe(true);
  });
  it("날짜가 다르면 항상 false", () => {
    expect(blocksOverlap(base, { date: "2026-06-16", start_time: "09:30", end_time: "11:00" })).toBe(false);
  });
  it("경계 접촉은 겹침 아님", () => {
    expect(blocksOverlap(base, { date: "2026-06-15", start_time: "10:00", end_time: "11:00" })).toBe(false);
  });
});

describe("isRangeWithinAvailable", () => {
  const avail: TimeBlock[] = [
    { date: "2026-06-15", start_time: "09:00", end_time: "18:00" },
  ];
  it("영업시간 안에 완전히 포함되면 true", () => {
    expect(isRangeWithinAvailable("2026-06-15", 600, 660, avail)).toBe(true); // 10:00~11:00
  });
  it("영업시간을 벗어나면 false", () => {
    expect(isRangeWithinAvailable("2026-06-15", 480, 600, avail)).toBe(false); // 08:00~10:00
  });
  it("날짜가 다르면 false", () => {
    expect(isRangeWithinAvailable("2026-06-16", 600, 660, avail)).toBe(false);
  });
  it("경계와 정확히 일치하면 포함으로 본다", () => {
    expect(isRangeWithinAvailable("2026-06-15", 540, 1080, avail)).toBe(true); // 09:00~18:00
  });
});
