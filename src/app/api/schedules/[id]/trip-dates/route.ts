import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// PUT /api/schedules/[id]/trip-dates — Set or update trip dates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tripStart, tripEnd } = await request.json();

    if (!tripStart || !tripEnd) {
      return NextResponse.json(
        { error: "여행 시작일과 종료일을 모두 선택해주세요." },
        { status: 400 }
      );
    }

    if (new Date(tripStart) > new Date(tripEnd)) {
      return NextResponse.json(
        { error: "시작일이 종료일보다 늦을 수 없습니다." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const data = await db.updateTripDates(id, tripStart, tripEnd);

    if (!data) {
      return NextResponse.json(
        { error: "스케줄을 찾을 수 없습니다." },
        { status: 404 }
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
