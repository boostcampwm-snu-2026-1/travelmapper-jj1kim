// 위시리스트 항목의 카테고리별 details 파싱 — UI 컴포넌트에서 분리한 순수 함수들.
import {
  WishlistItem,
  WishlistCategory,
  TransportDetails,
  PlaceDetails,
  StayDetails,
} from "@/lib/types";

export const PLACE_CATEGORIES: WishlistCategory[] = ["식사", "카페&디저트", "관광지"];

export function parseTransportDetails(item: WishlistItem): TransportDetails | null {
  if (item.category !== "교통" || !item.details) return null;
  try { return typeof item.details === "string" ? JSON.parse(item.details) : item.details; }
  catch { return null; }
}

export function parsePlaceDetails(item: WishlistItem): PlaceDetails | null {
  if (!PLACE_CATEGORIES.includes(item.category) || !item.details) return null;
  try { return typeof item.details === "string" ? JSON.parse(item.details) : item.details; }
  catch { return null; }
}

export function parseStayDetails(item: WishlistItem): StayDetails | null {
  if (item.category !== "숙박" || !item.details) return null;
  try { return typeof item.details === "string" ? JSON.parse(item.details) : item.details; }
  catch { return null; }
}

export function getCost(item: WishlistItem): number {
  const t = parseTransportDetails(item);
  if (t) return t.cost || 0;
  const p = parsePlaceDetails(item);
  if (p) return p.cost || 0;
  const s = parseStayDetails(item);
  if (s) return s.cost || 0;
  return 0;
}
