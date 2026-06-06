import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { DB } from "./db";
import { Schedule, ScheduleEvent, WishlistItem, WishlistCategory } from "./types";

const DB_PATH = path.join(process.cwd(), "local.db");

const globalForSqlite = globalThis as typeof globalThis & {
  _sqliteDb?: Database.Database;
};

function getSqlite(): Database.Database {
  if (!globalForSqlite._sqliteDb) {
    globalForSqlite._sqliteDb = new Database(DB_PATH);
    globalForSqlite._sqliteDb.pragma("journal_mode = WAL");
    globalForSqlite._sqliteDb.pragma("foreign_keys = ON");
    initTables(globalForSqlite._sqliteDb);
  }
  return globalForSqlite._sqliteDb;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      participants TEXT NOT NULL DEFAULT '[]',
      expires_at TEXT NOT NULL,
      trip_start TEXT,
      trip_end TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_events (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      participant TEXT,
      color TEXT DEFAULT '#3B82F6',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      added_by TEXT NOT NULL,
      details TEXT,
      confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_name ON schedules(name);
    CREATE INDEX IF NOT EXISTS idx_events_schedule_id ON schedule_events(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON schedule_events(schedule_id, date);
    CREATE INDEX IF NOT EXISTS idx_wishlist_schedule_id ON wishlist_items(schedule_id);
  `);

  // Migrate: add columns if missing
  const cols = db.pragma("table_info(wishlist_items)") as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("details")) {
    db.exec("ALTER TABLE wishlist_items ADD COLUMN details TEXT");
  }
  if (!colNames.includes("confirmed")) {
    db.exec("ALTER TABLE wishlist_items ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0");
  }
}

function rowToSchedule(row: Record<string, unknown>): Schedule {
  return {
    ...row,
    participants:
      typeof row.participants === "string"
        ? JSON.parse(row.participants as string)
        : row.participants,
  } as Schedule;
}

function rowToWishlistItem(row: Record<string, unknown>): WishlistItem {
  return {
    ...row,
    confirmed: row.confirmed === 1 || row.confirmed === true,
  } as WishlistItem;
}

export class LocalDB implements DB {
  async findScheduleById(id: string): Promise<Schedule | null> {
    const db = getSqlite();
    const row = db
      .prepare("SELECT * FROM schedules WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToSchedule(row) : null;
  }

  async findSchedulesByName(name: string): Promise<Schedule[]> {
    const db = getSqlite();
    const rows = db
      .prepare("SELECT * FROM schedules WHERE name = ?")
      .all(name) as Record<string, unknown>[];
    return rows.map(rowToSchedule);
  }

  async createSchedule(data: {
    name: string;
    password_hash: string;
    participants: string[];
    expires_at: string;
  }): Promise<Schedule> {
    const db = getSqlite();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO schedules (id, name, password_hash, participants, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.password_hash,
      JSON.stringify(data.participants),
      data.expires_at,
      now,
      now
    );

    const row = db
      .prepare("SELECT * FROM schedules WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToSchedule(row);
  }

  async updateTripDates(
    id: string,
    tripStart: string,
    tripEnd: string
  ): Promise<Schedule | null> {
    const db = getSqlite();
    const result = db
      .prepare(
        `UPDATE schedules SET trip_start = ?, trip_end = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(tripStart, tripEnd, id);

    if (result.changes === 0) return null;

    const row = db
      .prepare("SELECT * FROM schedules WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToSchedule(row);
  }

  async updateParticipants(
    id: string,
    participants: string[]
  ): Promise<Schedule | null> {
    const db = getSqlite();
    const result = db
      .prepare(
        `UPDATE schedules SET participants = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(JSON.stringify(participants), id);

    if (result.changes === 0) return null;

    const row = db
      .prepare("SELECT * FROM schedules WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToSchedule(row);
  }

  async extendExpiration(
    id: string,
    newExpiresAt: string
  ): Promise<Schedule | null> {
    const db = getSqlite();
    const result = db
      .prepare(
        `UPDATE schedules SET expires_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(newExpiresAt, id);

    if (result.changes === 0) return null;

    const row = db
      .prepare("SELECT * FROM schedules WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToSchedule(row);
  }

  async deleteExpired(): Promise<number> {
    const db = getSqlite();
    const now = new Date().toISOString();
    const result = db
      .prepare("DELETE FROM schedules WHERE expires_at < ?")
      .run(now);
    return result.changes;
  }

  async getEvents(
    scheduleId: string,
    date?: string
  ): Promise<ScheduleEvent[]> {
    const db = getSqlite();
    if (date) {
      return db
        .prepare(
          `SELECT * FROM schedule_events
           WHERE schedule_id = ? AND date = ?
           ORDER BY date, start_time`
        )
        .all(scheduleId, date) as ScheduleEvent[];
    }
    return db
      .prepare(
        `SELECT * FROM schedule_events
         WHERE schedule_id = ?
         ORDER BY date, start_time`
      )
      .all(scheduleId) as ScheduleEvent[];
  }

  async createEvent(data: {
    schedule_id: string;
    date: string;
    start_time: string;
    end_time: string;
    title: string;
    description: string | null;
    participant: string | null;
    color: string;
  }): Promise<ScheduleEvent> {
    const db = getSqlite();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO schedule_events
         (id, schedule_id, date, start_time, end_time, title, description, participant, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.schedule_id,
      data.date,
      data.start_time,
      data.end_time,
      data.title,
      data.description,
      data.participant,
      data.color,
      now,
      now
    );

    return db
      .prepare("SELECT * FROM schedule_events WHERE id = ?")
      .get(id) as ScheduleEvent;
  }

  async getWishlistItems(
    scheduleId: string,
    category?: WishlistCategory
  ): Promise<WishlistItem[]> {
    const db = getSqlite();
    let rows: Record<string, unknown>[];
    if (category) {
      rows = db
        .prepare(
          `SELECT * FROM wishlist_items
           WHERE schedule_id = ? AND category = ?
           ORDER BY confirmed ASC, created_at DESC`
        )
        .all(scheduleId, category) as Record<string, unknown>[];
    } else {
      rows = db
        .prepare(
          `SELECT * FROM wishlist_items
           WHERE schedule_id = ?
           ORDER BY category, confirmed ASC, created_at DESC`
        )
        .all(scheduleId) as Record<string, unknown>[];
    }
    return rows.map(rowToWishlistItem);
  }

  async getConfirmedWishlistItems(scheduleId: string): Promise<WishlistItem[]> {
    const db = getSqlite();
    const rows = db
      .prepare(
        `SELECT * FROM wishlist_items
         WHERE schedule_id = ? AND confirmed = 1
         ORDER BY created_at`
      )
      .all(scheduleId) as Record<string, unknown>[];
    return rows.map(rowToWishlistItem);
  }

  async createWishlistItem(data: {
    schedule_id: string;
    category: WishlistCategory;
    title: string;
    added_by: string;
    details?: string;
  }): Promise<WishlistItem> {
    const db = getSqlite();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO wishlist_items (id, schedule_id, category, title, added_by, details, confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(id, data.schedule_id, data.category, data.title, data.added_by, data.details || null, now);

    const row = db
      .prepare("SELECT * FROM wishlist_items WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToWishlistItem(row);
  }

  async updateWishlistItem(
    id: string,
    data: { title?: string; added_by?: string; details?: string; confirmed?: boolean }
  ): Promise<WishlistItem | null> {
    const db = getSqlite();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { sets.push("title = ?"); values.push(data.title); }
    if (data.added_by !== undefined) { sets.push("added_by = ?"); values.push(data.added_by); }
    if (data.details !== undefined) { sets.push("details = ?"); values.push(data.details); }
    if (data.confirmed !== undefined) { sets.push("confirmed = ?"); values.push(data.confirmed ? 1 : 0); }

    if (!sets.length) return null;
    values.push(id);

    const result = db
      .prepare(`UPDATE wishlist_items SET ${sets.join(", ")} WHERE id = ?`)
      .run(...values);

    if (result.changes === 0) return null;

    const row = db
      .prepare("SELECT * FROM wishlist_items WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToWishlistItem(row);
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    const db = getSqlite();
    const result = db
      .prepare("DELETE FROM wishlist_items WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}
