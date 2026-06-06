import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// PUT /api/schedules/[id]/extend — Extend schedule expiration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { days } = await request.json();

    if (!days || days < 1 || days > 90) {
      return NextResponse.json(
        { error: "연장 기간은 1일 이상 90일 이하로 설정해주세요." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const schedule = await db.findScheduleById(id);

    if (!schedule) {
      return NextResponse.json(
        { error: "스케줄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Check remaining days — only allow extension when ≤30 days remain
    const now = new Date();
    const expiresAt = new Date(schedule.expires_at);
    const remainingDays = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (remainingDays > 30) {
      return NextResponse.json(
        { error: "만료까지 30일 이하로 남았을 때만 연장할 수 있습니다." },
        { status: 400 }
      );
    }

    // Extend from current expiration date (not from now)
    const newExpiresAt = new Date(expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    const data = await db.extendExpiration(id, newExpiresAt.toISOString());

    if (!data) {
      return NextResponse.json(
        { error: "연장에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      participants: data.participants,
      created_at: data.created_at,
      expires_at: data.expires_at,
      trip_start: data.trip_start,
      trip_end: data.trip_end,
    });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
