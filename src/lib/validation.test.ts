import { describe, it, expect } from "vitest";
import {
  validateScheduleName,
  validatePassword,
  validateExpiresInDays,
} from "./validation";

describe("validateScheduleName", () => {
  it("한글/영문/숫자/일부 기호는 통과", () => {
    expect(validateScheduleName("제주 여행 2026!").ok).toBe(true);
    expect(validateScheduleName("Trip-A_B.C").ok).toBe(true);
  });
  it("이모지는 거부하고 메시지를 반환", () => {
    const r = validateScheduleName("여행 🏝️");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("이모지");
  });
});

describe("validatePassword", () => {
  it("영문 소문자+숫자 4~20자는 통과", () => {
    expect(validatePassword("abc123").ok).toBe(true);
    expect(validatePassword("a1").ok).toBe(false); // 너무 짧음
  });
  it("대문자/특수문자/한글은 거부", () => {
    expect(validatePassword("Abc123").ok).toBe(false);
    expect(validatePassword("abc!23").ok).toBe(false);
    expect(validatePassword("비밀번호1").ok).toBe(false);
  });
  it("21자 이상은 거부", () => {
    expect(validatePassword("a".repeat(21)).ok).toBe(false);
  });
});

describe("validateExpiresInDays", () => {
  it("1~90 정수는 통과 (문자열/숫자 모두)", () => {
    expect(validateExpiresInDays("30").ok).toBe(true);
    expect(validateExpiresInDays(90).ok).toBe(true);
    expect(validateExpiresInDays("1").ok).toBe(true);
  });
  it("0/음수/90 초과/비숫자는 거부", () => {
    expect(validateExpiresInDays("0").ok).toBe(false);
    expect(validateExpiresInDays(-5).ok).toBe(false);
    expect(validateExpiresInDays("91").ok).toBe(false);
    expect(validateExpiresInDays("abc").ok).toBe(false);
  });
});
