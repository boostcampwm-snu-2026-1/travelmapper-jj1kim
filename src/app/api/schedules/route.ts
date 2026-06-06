import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/schedules — Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, participants, expiresInDays } = body;

    if (!name || !password || !participants?.length) {
      return NextResponse.json(
        { error: "스케줄 이름, 비밀번호, 참여자를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const existing = await db.findSchedulesByName(name);

    for (const schedule of existing) {
      const isSamePassword = await bcrypt.compare(
        password,
        schedule.password_hash
      );
      if (isSamePassword) {
        return NextResponse.json(
          {
            error:
              "동일한 이름과 비밀번호를 가진 스케줄이 이미 존재합니다. 다른 비밀번호를 설정해주세요.",
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const days = expiresInDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const data = await db.createSchedule({
      name,
      password_hash: passwordHash,
      participants,
      expires_at: expiresAt.toISOString(),
    });

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
