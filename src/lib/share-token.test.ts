import { describe, it, expect, vi, afterEach } from "vitest";
import { generateShareToken, verifyShareToken } from "./share-token";

afterEach(() => {
  vi.useRealTimers();
});

describe("share-token", () => {
  it("라운드트립: 생성한 토큰을 검증하면 원래 scheduleId를 돌려준다", () => {
    const id = "a1b2c3d4-0000-1111-2222-333344445555";
    expect(verifyShareToken(generateShareToken(id))).toBe(id);
  });

  it("변조된 서명은 null을 반환한다", () => {
    const token = generateShareToken("schedule-xyz");
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [sid, exp] = decoded.split(":");
    const forged = Buffer.from(`${sid}:${exp}:deadbeef`).toString("base64url");
    expect(verifyShareToken(forged)).toBeNull();
  });

  it("scheduleId를 바꿔치기하면(서명 불일치) null을 반환한다", () => {
    const token = generateShareToken("schedule-xyz");
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [, exp, sig] = decoded.split(":");
    const forged = Buffer.from(`other-schedule:${exp}:${sig}`).toString("base64url");
    expect(verifyShareToken(forged)).toBeNull();
  });

  it("만료된 토큰은 null을 반환한다", () => {
    const token = generateShareToken("schedule-xyz", 1000); // 1초 후 만료
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2000); // 2초 경과
    expect(verifyShareToken(token)).toBeNull();
  });

  it("형식이 잘못되거나 빈 토큰은 throw 없이 null을 반환한다", () => {
    expect(verifyShareToken("")).toBeNull();
    expect(verifyShareToken("!!!not-base64!!!")).toBeNull();
    expect(verifyShareToken(Buffer.from("only-one-part").toString("base64url"))).toBeNull();
  });
});
