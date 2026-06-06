import { getSupabase } from "./supabase";
import { DB } from "./db";
import { Schedule, ScheduleEvent, WishlistItem, WishlistCategory } from "./types";

export class SupabaseDB implements DB {
  async findScheduleById(id: string): Promise<Schedule | null> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }

  async findSchedulesByName(name: string): Promise<Schedule[]> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .select("*")
      .eq("name", name);

    if (error) throw error;
    return data || [];
  }

  async createSchedule(input: {
    name: string;
    password_hash: string;
    participants: string[];
    expires_at: string;
  }): Promise<Schedule> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTripDates(
    id: string,
    tripStart: string,
    tripEnd: string
  ): Promise<Schedule | null> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .update({ trip_start: tripStart, trip_end: tripEnd })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateParticipants(
    id: string,
    participants: string[]
  ): Promise<Schedule | null> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .update({ participants })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async extendExpiration(
    id: string,
    newExpiresAt: string
  ): Promise<Schedule | null> {
    const { data, error } = await getSupabase()
      .from("schedules")
      .update({ expires_at: newExpiresAt })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const { data } = await getSupabase()
      .from("schedules")
      .delete()
      .lt("expires_at", now)
      .select("id");

    return data?.length || 0;
  }

  async getEvents(
    scheduleId: string,
    date?: string
  ): Promise<ScheduleEvent[]> {
    let query = getSupabase()
      .from("schedule_events")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("date")
      .order("start_time");

    if (date) {
      query = query.eq("date", date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createEvent(input: {
    schedule_id: string;
    date: string;
    start_time: string;
    end_time: string;
    title: string;
    description: string | null;
    participant: string | null;
    color: string;
  }): Promise<ScheduleEvent> {
    const { data, error } = await getSupabase()
      .from("schedule_events")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWishlistItems(
    scheduleId: string,
    category?: WishlistCategory
  ): Promise<WishlistItem[]> {
    let query = getSupabase()
      .from("wishlist_items")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("confirmed", { ascending: true })
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getConfirmedWishlistItems(scheduleId: string): Promise<WishlistItem[]> {
    const { data, error } = await getSupabase()
      .from("wishlist_items")
      .select("*")
      .eq("schedule_id", scheduleId)
      .eq("confirmed", true)
      .order("created_at");

    if (error) throw error;
    return data || [];
  }

  async createWishlistItem(input: {
    schedule_id: string;
    category: WishlistCategory;
    title: string;
    added_by: string;
    details?: string;
  }): Promise<WishlistItem> {
    const { data, error } = await getSupabase()
      .from("wishlist_items")
      .insert({ ...input, confirmed: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWishlistItem(
    id: string,
    updates: { title?: string; added_by?: string; details?: string; confirmed?: boolean }
  ): Promise<WishlistItem | null> {
    const { data, error } = await getSupabase()
      .from("wishlist_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from("wishlist_items")
      .delete()
      .eq("id", id);

    return !error;
  }
}
