import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireScheduleAuth } from "@/lib/session";
import { DEFAULT_EVENT_COLOR } from "@/lib/constants";
import { validateEventTiming, TIMING_ERROR_MESSAGE } from "@/lib/event-validation";

// GET /api/schedules/[id]/events — Get all events for a schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireScheduleAuth(request, id);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const db = await getDB();
    const events = await db.getEvents(id, date);

    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/events — Create a new event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireScheduleAuth(request, id);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const { date, start_time, end_time, title, description, participant, color } = body;

    if (!date || !start_time || !end_time || !title) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const db = await getDB();

    // 만료/소유 스케줄 확인 후 서버측 시간 검증(형식·순서·기간·겹침)
    const schedule = await db.findScheduleById(id);
    if (!schedule) {
      return NextResponse.json({ error: "스케줄을 찾을 수 없습니다." }, { status: 404 });
    }

    const existing = await db.getEvents(id, date);
    const timingError = validateEventTiming(
      { date, start_time, end_time },
      { tripStart: schedule.trip_start, tripEnd: schedule.trip_end, existing }
    );
    if (timingError) {
      const status = timingError === "overlap" ? 409 : 400;
      return NextResponse.json({ error: TIMING_ERROR_MESSAGE[timingError] }, { status });
    }

    const event = await db.createEvent({
      schedule_id: id,
      date,
      start_time,
      end_time,
      title,
      description: description || null,
      participant: participant || null,
      color: color || DEFAULT_EVENT_COLOR,
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
