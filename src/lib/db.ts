import { Schedule, ScheduleEvent, WishlistItem, WishlistCategory } from "./types";

export interface DB {
  // Schedules
  findScheduleById(id: string): Promise<Schedule | null>;
  findSchedulesByName(name: string): Promise<Schedule[]>;
  createSchedule(data: {
    name: string;
    password_hash: string;
    participants: string[];
    expires_at: string;
  }): Promise<Schedule>;
  updateTripDates(
    id: string,
    tripStart: string,
    tripEnd: string
  ): Promise<Schedule | null>;
  updateParticipants(id: string, participants: string[]): Promise<Schedule | null>;
  extendExpiration(id: string, newExpiresAt: string): Promise<Schedule | null>;
  deleteExpired(): Promise<number>;

  // Events
  getEvents(scheduleId: string, date?: string): Promise<ScheduleEvent[]>;
  createEvent(data: {
    schedule_id: string;
    date: string;
    start_time: string;
    end_time: string;
    title: string;
    description: string | null;
    participant: string | null;
    color: string;
  }): Promise<ScheduleEvent>;

  // Wishlist
  getWishlistItems(scheduleId: string, category?: WishlistCategory): Promise<WishlistItem[]>;
  getConfirmedWishlistItems(scheduleId: string): Promise<WishlistItem[]>;
  createWishlistItem(data: {
    schedule_id: string;
    category: WishlistCategory;
    title: string;
    added_by: string;
    details?: string;
  }): Promise<WishlistItem>;
  updateWishlistItem(
    id: string,
    data: { title?: string; added_by?: string; details?: string; confirmed?: boolean }
  ): Promise<WishlistItem | null>;
  deleteWishlistItem(id: string): Promise<boolean>;
}

const globalForDb = globalThis as typeof globalThis & {
  _db?: DB;
};

export async function getDB(): Promise<DB> {
  if (globalForDb._db) return globalForDb._db;

  const useSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (useSupabase) {
    const { SupabaseDB } = await import("./db-supabase");
    globalForDb._db = new SupabaseDB();
  } else {
    const { LocalDB } = await import("./db-local");
    globalForDb._db = new LocalDB();
  }

  return globalForDb._db;
}
