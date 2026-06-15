// API 라우트 공통 헬퍼 — 반복되던 에러 응답/로깅을 한 곳에 모은다.
import { NextResponse } from "next/server";

/** 표준 에러 JSON 응답. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 핸들러를 감싸 처리되지 않은 예외를 로깅하고 500으로 변환한다.
 * 각 라우트의 반복되던 try/catch(500) 블록을 대체한다.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      return jsonError("서버 오류가 발생했습니다.", 500);
    }
  };
}
