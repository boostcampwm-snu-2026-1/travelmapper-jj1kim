// 스케줄 공유 링크용 서명 토큰.
// 형식: base64url( "scheduleId:exp:hmac(scheduleId:exp)" )
// - exp(만료 epoch ms)를 서명 입력에 포함해 만료된 링크를 무효화한다.
// - 전체 HMAC 다이제스트 + 타이밍 안전 비교로 위조를 방지한다.
import { hmacHex, timingSafeEqualHex } from "./signing";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export function generateShareToken(
  scheduleId: string,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const exp = Date.now() + ttlMs;
  const body = `${scheduleId}:${exp}`;
  return Buffer.from(`${body}:${hmacHex(body)}`).toString("base64url");
}

export function verifyShareToken(token: string): string | null {
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
