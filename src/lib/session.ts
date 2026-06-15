// 경량 세션 — 로그인/생성/공유 접근 시 발급하는 서명 쿠키로 스케줄 소유권을 증명한다.
// HttpOnly 쿠키에 "scheduleId:exp:hmac"을 담아, [id]/* 엔드포인트가 요청자의 권한을 확인한다.
//
// next/server는 타입으로만 가져오므로(런타임 import 없음) 이 모듈은 순수 crypto만 실행한다 → 단위 테스트 가능.
import type { NextRequest, NextResponse } from "next/server";
import { hmacHex, timingSafeEqualHex } from "./signing";

export const SESSION_COOKIE = "tm_session";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export function createSessionToken(
  scheduleId: string,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const exp = Date.now() + ttlMs;
  const body = `${scheduleId}:${exp}`;
  return Buffer.from(`${body}:${hmacHex(body)}`).toString("base64url");
}

/** 유효하면 scheduleId, 아니면 null. (서명·만료·형식 모두 검사) */
export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [scheduleId, expStr, sig] = parts;
    if (!scheduleId || !expStr || !sig) return null;

    if (!timingSafeEqualHex(sig, hmacHex(`${scheduleId}:${expStr}`))) return null;

    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;

    return scheduleId;
  } catch {
    return null;
  }
}

function cookieOptions(ttlMs: number = DEFAULT_TTL_MS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  };
}

/** 응답에 세션 쿠키를 심는다. (NextResponse는 타입이지만 런타임 객체는 라우트가 전달) */
export function setSessionCookie(res: NextResponse, scheduleId: string): void {
  res.cookies.set(SESSION_COOKIE, createSessionToken(scheduleId), cookieOptions());
}

export type AuthResult =
  | { ok: true; scheduleId: string }
  | { ok: false; status: number; error: string };

function readSession(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

/** 요청자가 해당 scheduleId의 세션을 가지고 있는지 확인한다. */
export function requireScheduleAuth(
  request: NextRequest,
  scheduleId: string
): AuthResult {
  const sid = readSession(request);
  if (!sid) return { ok: false, status: 401, error: "로그인이 필요합니다." };
  if (sid !== scheduleId) {
    return { ok: false, status: 403, error: "이 스케줄에 접근할 권한이 없습니다." };
  }
  return { ok: true, scheduleId: sid };
}

/** 특정 스케줄에 묶이지 않은, 유효한 세션이기만 하면 통과(예: 경로 탐색 프록시). */
export function requireAnySession(request: NextRequest): AuthResult {
  const sid = readSession(request);
  if (!sid) return { ok: false, status: 401, error: "로그인이 필요합니다." };
  return { ok: true, scheduleId: sid };
}
