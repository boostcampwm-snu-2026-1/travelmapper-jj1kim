import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { generateShareToken, verifyShareToken } from "@/lib/share-token";

// GET /api/schedules/share?token=xxx — Access schedule via share link
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
    }

    const scheduleId = verifyShareToken(token);
    if (!scheduleId) {
      return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 401 });
    }

    const db = await getDB();
    const schedule = await db.findScheduleById(scheduleId);
    if (!schedule) {
      return NextResponse.json({ error: "스케줄을 찾을 수 없습니다." }, { status: 404 });
    }

    if (new Date(schedule.expires_at) < new Date()) {
      return NextResponse.json({ error: "만료된 스케줄입니다." }, { status: 410 });
    }

    return NextResponse.json({
      id: schedule.id,
      name: schedule.name,
      participants: schedule.participants,
      created_at: schedule.created_at,
      expires_at: schedule.expires_at,
      trip_start: schedule.trip_start,
      trip_end: schedule.trip_end,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/schedules/share — Generate share token for a schedule
export async function POST(request: NextRequest) {
  try {
    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: "스케줄 ID가 필요합니다." }, { status: 400 });
    }

    const token = generateShareToken(scheduleId);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
