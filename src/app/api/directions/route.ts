import { NextRequest, NextResponse } from "next/server";
import { requireAnySession } from "@/lib/session";

// Server-side proxy for Legacy Directions API
// This bypasses the "new API mode" restriction on client-side calls
export async function GET(request: NextRequest) {
  // 익명 호출에 의한 쿼터 남용을 막기 위해 유효한 세션을 요구한다.
  const auth = requireAnySession(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const mode = searchParams.get("mode") || "transit";
  const departureTime = searchParams.get("departure_time");

  if (!origin || !destination) {
    return NextResponse.json({ error: "출발지와 도착지를 모두 입력해주세요." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되어 있지 않습니다." }, { status: 500 });
  }

  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}&language=ko&alternatives=true`;

  if (departureTime) {
    url += `&departure_time=${departureTime}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api] directions GET:", err);
    return NextResponse.json({ error: "경로를 불러오지 못했습니다." }, { status: 500 });
  }
}
