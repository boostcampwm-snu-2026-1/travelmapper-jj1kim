// 스케줄 생성 입력 검증 — 클라이언트(page.tsx)와 서버(API 라우트)가 공유하는 단일 출처.
// 메시지는 기존 클라이언트 검증과 동일하게 유지해 UX가 바뀌지 않도록 한다.
import { MAX_EXPIRY_DAYS } from "./constants";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const OK: ValidationResult = { ok: true };

// 이모지/허용되지 않은 특수문자를 차단(한글/영문/숫자/공백/일부 기호만 허용).
export const SCHEDULE_NAME_REGEX =
  /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s\-_.,!?@#&()'+:;/\\]+$/;

// 영문 소문자 + 숫자 4~20자.
export const PASSWORD_REGEX = /^[a-z0-9]{4,20}$/;

export function validateScheduleName(name: string): ValidationResult {
  if (!SCHEDULE_NAME_REGEX.test(name)) {
    return { ok: false, error: "스케줄 이름에 이모지나 특수 문자를 사용할 수 없습니다." };
  }
  return OK;
}

export function validatePassword(password: string): ValidationResult {
  if (!PASSWORD_REGEX.test(password)) {
    return {
      ok: false,
      error: "비밀번호는 4~20자의 영문 소문자와 숫자 조합이어야 합니다.",
    };
  }
  return OK;
}

/** 문자열/숫자 모두 허용. 1 이상 MAX_EXPIRY_DAYS 이하 정수만 통과. */
export function validateExpiresInDays(value: string | number): ValidationResult {
  const days = typeof value === "number" ? value : parseInt(value, 10);
  if (!days || days < 1 || days > MAX_EXPIRY_DAYS) {
    return {
      ok: false,
      error: `만료 기한은 1일 이상 ${MAX_EXPIRY_DAYS}일 이하로 입력해주세요.`,
    };
  }
  return OK;
}
