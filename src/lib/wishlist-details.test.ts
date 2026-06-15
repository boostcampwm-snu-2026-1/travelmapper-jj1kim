import { describe, it, expect } from "vitest";
import {
  parseTransportDetails,
  parsePlaceDetails,
  parseStayDetails,
  getCost,
} from "./wishlist-details";
import type {
  WishlistItem,
  WishlistCategory,
  TransportDetails,
  PlaceDetails,
  StayDetails,
} from "./types";

// 공통 베이스 — 테스트마다 category / details 만 바꿔 쓴다.
function makeItem(category: WishlistCategory, details: string | object | null): WishlistItem {
  return {
    id: "i1",
    schedule_id: "s1",
    category,
    title: "t",
    added_by: "a",
    details: typeof details === "string" || details === null ? (details as string | null) : JSON.stringify(details),
    confirmed: false,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

const transport: TransportDetails = {
  transport_name: "KTX",
  departure_place: { name: "서울역" },
  departure_time: "2026-06-01T09:00",
  arrival_place: { name: "부산역" },
  arrival_time: "2026-06-01T12:00",
  cost: 60000,
  notes: "",
};

const place: PlaceDetails = {
  name: "맛집",
  place: { name: "맛집" },
  business_hours: [],
  confirmed_slots: [],
  cost: 15000,
  notes: "",
};

const stay: StayDetails = {
  name: "호텔",
  place: { name: "호텔" },
  check_in_time: "15:00",
  check_out_time: "11:00",
  stay_start: "2026-06-01",
  stay_end: "2026-06-02",
  confirmed_slots: [],
  cost: 120000,
  notes: "",
};

describe("parseTransportDetails", () => {
  it("카테고리가 교통이 아니면 null", () => {
    expect(parseTransportDetails(makeItem("관광지", JSON.stringify(transport)))).toBeNull();
  });
  it("details가 없으면 null", () => {
    expect(parseTransportDetails(makeItem("교통", null))).toBeNull();
  });
  it("JSON이 깨졌으면 null", () => {
    expect(parseTransportDetails(makeItem("교통", "{not json"))).toBeNull();
  });
  it("JSON 문자열을 파싱한다", () => {
    expect(parseTransportDetails(makeItem("교통", JSON.stringify(transport)))).toEqual(transport);
  });
  it("이미 객체이면 그대로 반환한다", () => {
    const item = { ...makeItem("교통", null), details: transport as unknown as string };
    expect(parseTransportDetails(item)).toEqual(transport);
  });
});

describe("parsePlaceDetails", () => {
  it("place 카테고리가 아니면 null", () => {
    expect(parsePlaceDetails(makeItem("교통", JSON.stringify(place)))).toBeNull();
    expect(parsePlaceDetails(makeItem("숙박", JSON.stringify(place)))).toBeNull();
  });
  it("details가 없으면 null", () => {
    expect(parsePlaceDetails(makeItem("관광지", null))).toBeNull();
  });
  it("JSON이 깨졌으면 null", () => {
    expect(parsePlaceDetails(makeItem("식사", "{not json"))).toBeNull();
  });
  it("place 카테고리들에서 JSON 문자열을 파싱한다", () => {
    for (const cat of ["식사", "카페&디저트", "관광지"] as WishlistCategory[]) {
      expect(parsePlaceDetails(makeItem(cat, JSON.stringify(place)))).toEqual(place);
    }
  });
  it("이미 객체이면 그대로 반환한다", () => {
    const item = { ...makeItem("관광지", null), details: place as unknown as string };
    expect(parsePlaceDetails(item)).toEqual(place);
  });
});

describe("parseStayDetails", () => {
  it("카테고리가 숙박이 아니면 null", () => {
    expect(parseStayDetails(makeItem("관광지", JSON.stringify(stay)))).toBeNull();
  });
  it("details가 없으면 null", () => {
    expect(parseStayDetails(makeItem("숙박", null))).toBeNull();
  });
  it("JSON이 깨졌으면 null", () => {
    expect(parseStayDetails(makeItem("숙박", "{not json"))).toBeNull();
  });
  it("JSON 문자열을 파싱한다", () => {
    expect(parseStayDetails(makeItem("숙박", JSON.stringify(stay)))).toEqual(stay);
  });
  it("이미 객체이면 그대로 반환한다", () => {
    const item = { ...makeItem("숙박", null), details: stay as unknown as string };
    expect(parseStayDetails(item)).toEqual(stay);
  });
});

describe("getCost", () => {
  it("교통 비용을 반환한다", () => {
    expect(getCost(makeItem("교통", JSON.stringify(transport)))).toBe(60000);
  });
  it("place 비용을 반환한다", () => {
    expect(getCost(makeItem("관광지", JSON.stringify(place)))).toBe(15000);
  });
  it("숙박 비용을 반환한다", () => {
    expect(getCost(makeItem("숙박", JSON.stringify(stay)))).toBe(120000);
  });
  it("cost 필드가 없으면 0", () => {
    const noCost = { ...transport };
    delete noCost.cost;
    expect(getCost(makeItem("교통", JSON.stringify(noCost)))).toBe(0);
  });
  it("details가 없으면 0", () => {
    expect(getCost(makeItem("교통", null))).toBe(0);
  });
});
