import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/schedules/login — Login to an existing schedule
export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "스케줄 이름과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Clean up expired schedules on each login attempt
    await db.deleteExpired();

    const schedules = await db.findSchedulesByName(name);

    if (!schedules.length) {
      return NextResponse.json(
        { error: "해당 이름의 스케줄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    for (const schedule of schedules) {
      if (new Date(schedule.expires_at) < new Date()) {
        continue;
      }

      const isMatch = await bcrypt.compare(password, schedule.password_hash);
      if (isMatch) {
        return NextResponse.json({
          id: schedule.id,
          name: schedule.name,
          participants: schedule.participants,
          created_at: schedule.created_at,
          expires_at: schedule.expires_at,
          trip_start: schedule.trip_start,
          trip_end: schedule.trip_end,
        });
      }
    }

    return NextResponse.json(
      { error: "비밀번호가 일치하지 않거나 만료된 스케줄입니다." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
