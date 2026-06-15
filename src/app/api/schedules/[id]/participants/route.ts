import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireScheduleAuth } from "@/lib/session";
import { toScheduleResponse } from "@/lib/serializers";

// PUT /api/schedules/[id]/participants — Update participants
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireScheduleAuth(request, id);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { participants } = await request.json();

    if (!participants || !Array.isArray(participants) || !participants.length) {
      return NextResponse.json(
        { error: "참여자를 최소 1명 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const cleaned = participants.map((p: string) => p.trim()).filter(Boolean);
    if (!cleaned.length) {
      return NextResponse.json(
        { error: "참여자를 최소 1명 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const data = await db.updateParticipants(id, cleaned);

    if (!data) {
      return NextResponse.json(
        { error: "스케줄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(toScheduleResponse(data));
  } catch (err) {
    console.error("[api] schedules/[id]/participants PUT:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
