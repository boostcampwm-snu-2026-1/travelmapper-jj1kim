// 정책성 매직 넘버/값을 한 곳에 모은 모듈. 정책 변경 시 동기화 누락을 막는다.

/** 스케줄 기본 만료 기한(일). */
export const DEFAULT_EXPIRY_DAYS = 90;

/** 스케줄 생성 시 허용하는 최대 만료 기한(일). */
export const MAX_EXPIRY_DAYS = 90;

/** 한 번에 연장 가능한 최대 일수. */
export const MAX_EXTEND_DAYS = 90;

/** 만료까지 이 일수 이하로 남았을 때만 연장을 허용한다. */
export const EXTEND_THRESHOLD_DAYS = 30;

/** 확정 이벤트 기본 색상. */
export const DEFAULT_EVENT_COLOR = "#3B82F6";

/** "이때 뭐하지?" 추천에서 영업시간과 겹쳐야 하는 최소 분. */
export const MIN_SUGGESTION_OVERLAP_MIN = 30;
