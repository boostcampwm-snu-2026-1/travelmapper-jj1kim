import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { WishlistCategory, WISHLIST_CATEGORIES } from "@/lib/types";

// GET /api/schedules/[id]/wishlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as WishlistCategory | null;
    const confirmedOnly = searchParams.get("confirmed") === "true";

    const db = await getDB();

    if (confirmedOnly) {
      const items = await db.getConfirmedWishlistItems(id);
      return NextResponse.json(items);
    }

    const items = await db.getWishlistItems(id, category || undefined);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/schedules/[id]/wishlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { category, title, added_by, details } = await request.json();

    if (!category || !title || !added_by) {
      return NextResponse.json(
        { error: "카테고리, 일정 이름, 추가자를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    if (!WISHLIST_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "유효하지 않은 카테고리입니다." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const item = await db.createWishlistItem({
      schedule_id: id,
      category,
      title,
      added_by,
      details: details ? JSON.stringify(details) : undefined,
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id]/wishlist — Update a wishlist item
export async function PUT(request: NextRequest) {
  try {
    const { itemId, title, added_by, details, confirmed } =
      await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "항목 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const updateData: {
      title?: string;
      added_by?: string;
      details?: string;
      confirmed?: boolean;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (added_by !== undefined) updateData.added_by = added_by;
    if (details !== undefined)
      updateData.details = typeof details === "string" ? details : JSON.stringify(details);
    if (confirmed !== undefined) updateData.confirmed = confirmed;

    const item = await db.updateWishlistItem(itemId, updateData);

    if (!item) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id]/wishlist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "삭제할 항목 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const db = await getDB();
    const deleted = await db.deleteWishlistItem(itemId);

    if (!deleted) {
      return NextResponse.json(
        { error: "항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
