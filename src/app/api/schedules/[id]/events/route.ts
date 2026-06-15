import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireScheduleAuth } from "@/lib/session";

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
    const event = await db.createEvent({
      schedule_id: id,
      date,
      start_time,
      end_time,
      title,
      description: description || null,
      participant: participant || null,
      color: color || "#3B82F6",
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
