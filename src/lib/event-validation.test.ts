import { describe, it, expect } from "vitest";
import { isValidTime, validateEventTiming } from "./event-validation";

describe("isValidTime", () => {
  it("00:00~24:00은 유효", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(true); // 자정 종료 허용
  });
  it("범위/형식 위반은 무효", () => {
    expect(isValidTime("24:30")).toBe(false);
    expect(isValidTime("25:00")).toBe(false);
    expect(isValidTime("12:60")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
    expect(isValidTime("abc")).toBe(false);
  });
});

describe("validateEventTiming", () => {
  const base = { date: "2026-06-15", start_time: "10:00", end_time: "11:00" };

  it("정상 입력은 null", () => {
    expect(validateEventTiming(base)).toBeNull();
  });
  it("형식 오류는 format", () => {
    expect(validateEventTiming({ ...base, start_time: "9:00" })).toBe("format");
  });
  it("시작>=종료는 order", () => {
    expect(validateEventTiming({ ...base, start_time: "11:00", end_time: "11:00" })).toBe("order");
    expect(validateEventTiming({ ...base, start_time: "12:00", end_time: "11:00" })).toBe("order");
  });
  it("여행 기간 밖이면 range", () => {
    const ctx = { tripStart: "2026-06-15", tripEnd: "2026-06-17" };
    expect(validateEventTiming({ ...base, date: "2026-06-20" }, ctx)).toBe("range");
    expect(validateEventTiming(base, ctx)).toBeNull();
  });
  it("기존 이벤트와 겹치면 overlap, 경계 접촉은 통과", () => {
    const existing = [{ date: "2026-06-15", start_time: "10:30", end_time: "12:00" }];
    expect(validateEventTiming(base, { existing })).toBe("overlap");
    // 11:00에 시작하는 이벤트는 기존 10:00~11:00과 경계 접촉 → 통과
    expect(
      validateEventTiming({ date: "2026-06-15", start_time: "12:00", end_time: "13:00" }, { existing })
    ).toBeNull();
  });
  it("다른 날짜의 이벤트와는 겹치지 않는다", () => {
    const existing = [{ date: "2026-06-16", start_time: "10:00", end_time: "12:00" }];
    expect(validateEventTiming(base, { existing })).toBeNull();
  });
});
