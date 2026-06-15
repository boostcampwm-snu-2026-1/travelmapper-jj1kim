// HMAC 서명 공용 유틸 — 공유 토큰과 세션 토큰이 함께 사용한다.
import crypto from "crypto";

// 개발 편의를 위한 dev 전용 폴백. 프로덕션에서는 절대 사용되지 않는다.
const DEV_FALLBACK_SECRET = "tm-dev-only-insecure-secret";
let warnedDevFallback = false;

/**
 * 서명 비밀키.
 * - 환경변수가 있으면 그대로 사용.
 * - 프로덕션에서 미설정이면 즉시 throw (소스에 노출된 기본값 위조 차단).
 * - 개발에서 미설정이면 경고 후 dev 전용 값으로 폴백 (로컬 DX 유지).
 */
export function getSigningSecret(): string {
  const secret = process.env.SHARE_LINK_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SHARE_LINK_SECRET 환경변수가 설정되지 않았습니다.");
  }

  if (!warnedDevFallback) {
    warnedDevFallback = true;
    console.warn(
      "[signing] SHARE_LINK_SECRET 미설정 — 개발용 임시 키로 폴백합니다. 배포 전 반드시 설정하세요."
    );
  }
  return DEV_FALLBACK_SECRET;
}

/** data의 HMAC-SHA256 전체 다이제스트(hex). */
export function hmacHex(data: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(data).digest("hex");
}

/** 두 hex 문자열을 타이밍 안전하게 비교. 길이가 다르거나 잘못된 hex면 false. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  let ab: Buffer;
  let bb: Buffer;
  try {
    ab = Buffer.from(a, "hex");
    bb = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
