export interface Schedule {
  id: string;
  name: string;
  password_hash: string;
  participants: string[];
  expires_at: string;
  trip_start: string | null;
  trip_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEvent {
  id: string;
  schedule_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  participant: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export const WISHLIST_CATEGORIES = [
  "교통",
  "숙박",
  "식사",
  "카페&디저트",
  "관광지",
] as const;

export type WishlistCategory = (typeof WISHLIST_CATEGORIES)[number];

export interface PlaceInfo {
  name: string;
  place_id?: string;
  lat?: number;
  lng?: number;
}

export interface TransportDetails {
  transport_name: string;
  departure_place: PlaceInfo;
  departure_time: string; // "YYYY-MM-DDTHH:mm"
  arrival_place: PlaceInfo;
  arrival_time: string;   // "YYYY-MM-DDTHH:mm"
  cost?: number;          // 총 비용 (원)
  notes: string;
}

export interface TimeBlock {
  date: string;       // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

export interface PlaceDetails {
  name: string;
  place: PlaceInfo;
  business_hours: TimeBlock[];
  confirmed_slots: TimeBlock[];
  cost?: number;
  notes: string;
}

export interface StayDetails {
  name: string;
  place: PlaceInfo;
  check_in_time: string;   // "HH:MM"
  check_out_time: string;  // "HH:MM"
  stay_start: string;      // "YYYY-MM-DD"
  stay_end: string;        // "YYYY-MM-DD"
  confirmed_slots: TimeBlock[];
  cost?: number;
  notes: string;
}

export interface WishlistItem {
  id: string;
  schedule_id: string;
  category: WishlistCategory;
  title: string;
  added_by: string;
  details: string | null; // JSON string for category-specific data
  confirmed: boolean;
  created_at: string;
}

export interface CreateScheduleRequest {
  name: string;
  password: string;
  participants: string[];
  expiresInDays?: number;
}

export interface LoginScheduleRequest {
  name: string;
  password: string;
}

export interface SetTripDatesRequest {
  scheduleId: string;
  tripStart: string;
  tripEnd: string;
}
