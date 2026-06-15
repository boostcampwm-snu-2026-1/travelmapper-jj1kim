import { describe, it, expect } from "vitest";
import { formatDuration, formatDistance } from "./routes";

describe("formatDuration", () => {
  it("1시간 미만은 분만 표시한다", () => {
    expect(formatDuration(0)).toBe("0분");
    expect(formatDuration(59)).toBe("0분"); // 60초 미만은 0분
    expect(formatDuration(60)).toBe("1분");
    expect(formatDuration(1500)).toBe("25분");
  });

  it("1시간 이상은 시간과 분을 함께 표시한다", () => {
    expect(formatDuration(3600)).toBe("1시간 0분");
    expect(formatDuration(3660)).toBe("1시간 1분");
    expect(formatDuration(7320)).toBe("2시간 2분");
  });
});

describe("formatDistance", () => {
  it("1000m 미만은 m 단위로 표시한다", () => {
    expect(formatDistance(0)).toBe("0m");
    expect(formatDistance(999)).toBe("999m");
  });

  it("1000m 이상은 소수점 1자리 km로 표시한다", () => {
    expect(formatDistance(1000)).toBe("1.0km");
    expect(formatDistance(1500)).toBe("1.5km");
    expect(formatDistance(12345)).toBe("12.3km");
  });
});
