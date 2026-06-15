import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  getDatesInRange,
  formatDateShort,
  formatDateFull,
  formatDateHeader,
} from "./time";

describe("timeToMinutes", () => {
  it.each([
    ["00:00", 0],
    ["00:30", 30],
    ["09:05", 545],
    ["23:59", 1439],
    ["24:00", 1440],
  ])("%s → %i분", (t, expected) => {
    expect(timeToMinutes(t)).toBe(expected);
  });

  it("분이 생략되면 0분으로 본다", () => {
    expect(timeToMinutes("10")).toBe(600);
  });
});

describe("minutesToTime", () => {
  it.each([
    [0, "00:00"],
    [30, "00:30"],
    [545, "09:05"],
    [1439, "23:59"],
    [1440, "24:00"],
  ])("%i분 → %s", (m, expected) => {
    expect(minutesToTime(m)).toBe(expected);
  });

  it("범위를 벗어난 값은 0~1440으로 클램프한다", () => {
    expect(minutesToTime(-10)).toBe("00:00");
    expect(minutesToTime(2000)).toBe("24:00");
  });

  it("timeToMinutes와 라운드트립이 일치한다", () => {
    for (const t of ["00:00", "08:30", "12:45", "23:59"]) {
      expect(minutesToTime(timeToMinutes(t))).toBe(t);
    }
  });
});

describe("getDatesInRange", () => {
  it("시작=종료면 하루만 반환한다", () => {
    expect(getDatesInRange("2026-06-15", "2026-06-15")).toEqual(["2026-06-15"]);
  });

  it("연속된 날짜를 포함(양끝 포함)해 반환한다", () => {
    expect(getDatesInRange("2026-06-15", "2026-06-18")).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
    ]);
  });

  it("월말을 넘어가는 경계를 올바르게 처리한다", () => {
    expect(getDatesInRange("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("윤년 2월 29일을 포함한다", () => {
    expect(getDatesInRange("2028-02-28", "2028-03-01")).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });
});

describe("formatDate 계열", () => {
  // 2026-06-15는 월요일
  it("formatDateShort", () => {
    expect(formatDateShort("2026-06-15")).toEqual({
      day: "15",
      weekday: "월",
      monthDay: "6/15",
    });
  });
  it("formatDateFull", () => {
    expect(formatDateFull("2026-06-15")).toBe("6월 15일 (월)");
  });
  it("formatDateHeader", () => {
    expect(formatDateHeader("2026-06-15")).toBe("6/15 월");
  });
});
