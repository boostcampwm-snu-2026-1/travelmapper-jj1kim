import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  requireScheduleAuth,
  requireAnySession,
  SESSION_COOKIE,
} from "./session";
import type { NextRequest } from "next/server";

afterEach(() => {
  vi.useRealTimers();
});

// 쿠키 jar를 흉내내는 최소 NextRequest 목
function mockRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === SESSION_COOKIE && token !== undefined ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

describe("session token", () => {
  it("라운드트립으로 scheduleId를 복원한다", () => {
    const id = "sched-123";
    expect(verifySessionToken(createSessionToken(id))).toBe(id);
  });

  it("변조/형식 오류는 null", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("garbage")).toBeNull();
  });

  it("만료된 세션은 null", () => {
    const token = createSessionToken("sched-123", 1000);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2000);
    expect(verifySessionToken(token)).toBeNull();
  });
});

describe("requireScheduleAuth", () => {
  it("쿠키가 없으면 401", () => {
    const r = requireScheduleAuth(mockRequest(undefined), "sched-1");
    expect(r).toEqual({ ok: false, status: 401, error: expect.any(String) });
  });

  it("다른 스케줄의 세션이면 403", () => {
    const token = createSessionToken("sched-OTHER");
    const r = requireScheduleAuth(mockRequest(token), "sched-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("일치하는 세션이면 통과", () => {
    const token = createSessionToken("sched-1");
    const r = requireScheduleAuth(mockRequest(token), "sched-1");
    expect(r).toEqual({ ok: true, scheduleId: "sched-1" });
  });
});

describe("requireAnySession", () => {
  it("유효한 세션이면 scheduleId와 함께 통과", () => {
    const token = createSessionToken("sched-9");
    expect(requireAnySession(mockRequest(token))).toEqual({ ok: true, scheduleId: "sched-9" });
  });
  it("세션이 없으면 401", () => {
    const r = requireAnySession(mockRequest(undefined));
    expect(r.ok).toBe(false);
  });
});
