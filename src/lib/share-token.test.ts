import { describe, it, expect } from "vitest";
import { generateShareToken, verifyShareToken } from "./share-token";

describe("share-token", () => {
  it("라운드트립: 생성한 토큰을 검증하면 원래 scheduleId를 돌려준다", () => {
    const id = "a1b2c3d4-0000-1111-2222-333344445555";
    const token = generateShareToken(id);
    expect(verifyShareToken(token)).toBe(id);
  });

  it("서로 다른 scheduleId는 서로 다른 토큰을 만든다", () => {
    expect(generateShareToken("id-one")).not.toBe(generateShareToken("id-two"));
  });

  it("변조된 토큰(서명 불일치)은 null을 반환한다", () => {
    const token = generateShareToken("schedule-xyz");
    // base64url 디코딩 후 payload를 다른 id로 바꿔 재인코딩 → 서명 불일치
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [, hmac] = decoded.split(":");
    const forged = Buffer.from(`other-schedule:${hmac}`).toString("base64url");
    expect(verifyShareToken(forged)).toBeNull();
  });

  it("hmac 없이 scheduleId만 있는 토큰은 null을 반환한다", () => {
    const noHmac = Buffer.from("schedule-only").toString("base64url");
    expect(verifyShareToken(noHmac)).toBeNull();
  });

  it("잘못된 base64/빈 문자열은 throw 없이 null을 반환한다", () => {
    expect(verifyShareToken("")).toBeNull();
    expect(verifyShareToken("!!!not-base64!!!")).toBeNull();
  });
});
