// 스케줄 직렬화 단일 출처 — password_hash 같은 민감 필드가 응답에 새지 않도록 보장한다.
import type { Schedule } from "./types";

export interface ScheduleResponse {
  id: string;
  name: string;
  participants: string[];
  created_at: string;
  expires_at: string;
  trip_start: string | null;
  trip_end: string | null;
}

/** Schedule에서 클라이언트에 노출해도 되는 필드만 추려 반환한다. (password_hash 제외) */
export function toScheduleResponse(s: Schedule): ScheduleResponse {
  return {
    id: s.id,
    name: s.name,
    participants: s.participants,
    created_at: s.created_at,
    expires_at: s.expires_at,
    trip_start: s.trip_start,
    trip_end: s.trip_end,
  };
}
