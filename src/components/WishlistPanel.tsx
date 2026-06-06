"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  WishlistItem,
  WishlistCategory,
  WISHLIST_CATEGORIES,
  TransportDetails,
  PlaceDetails,
  StayDetails,
  TimeBlock,
} from "@/lib/types";
import { createGuard } from "@/lib/guard";
import TransportForm from "./TransportForm";
import PlaceForm from "./PlaceForm";
import StayForm from "./StayForm";
import ConfirmScheduleModal from "./ConfirmScheduleModal";

interface WishlistPanelProps {
  scheduleId: string;
  participants: string[];
  tripStart: string;
  tripEnd: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmChange?: () => void;
  openItemId?: string | null;
  onItemOpened?: () => void;
}

const CATEGORY_ICONS: Record<WishlistCategory, string> = {
  "교통": "🚗", "숙박": "🏨", "식사": "🍽️", "카페&디저트": "☕", "관광지": "📍",
};

const PLACE_CATEGORIES: WishlistCategory[] = ["식사", "카페&디저트", "관광지"];

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

function formatTransportSummary(d: TransportDetails): string {
  const dep = d.departure_time?.split("T")[1] || "";
  const arr = d.arrival_time?.split("T")[1] || "";
  return `${d.departure_place.name} ${dep} → ${d.arrival_place.name} ${arr}`;
}

function formatPlaceSummary(d: PlaceDetails): string {
  return d.place.name;
}

function formatStaySummary(d: StayDetails): string {
  return `${d.stay_start} ~ ${d.stay_end} (체크인 ${d.check_in_time}, 체크아웃 ${d.check_out_time})`;
}

// Generate available TimeBlocks for stay confirmation
function stayAvailableSlots(d: StayDetails): TimeBlock[] {
  const slots: TimeBlock[] = [];
  const dates: string[] = [];
  const cur = new Date(d.stay_start + "T00:00:00");
  const last = new Date(d.stay_end + "T00:00:00");
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  for (let i = 0; i < dates.length; i++) {
    const isFirst = i === 0;
    const isLast = i === dates.length - 1;
    slots.push({
      date: dates[i],
      start_time: isFirst ? d.check_in_time : "00:00",
      end_time: isLast ? d.check_out_time : "23:59",
    });
  }
  return slots;
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getCost(item: WishlistItem): number {
  const t = parseTransportDetails(item);
  if (t) return t.cost || 0;
  const p = parsePlaceDetails(item);
  if (p) return p.cost || 0;
  const s = parseStayDetails(item);
  if (s) return s.cost || 0;
  return 0;
}

// ─── Detail Modal ───
function ItemDetailModal({
  item, participants, tripStart, tripEnd, scheduleId, tripDates, onClose, onUpdated,
}: {
  item: WishlistItem; participants: string[]; tripStart: string; tripEnd: string;
  scheduleId: string; tripDates: string[]; onClose: () => void; onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const transport = parseTransportDetails(item);
  const place = parsePlaceDetails(item);
  const stay = parseStayDetails(item);
  const guard = createGuard();

  const handleDelete = () => guard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist?itemId=${item.id}`, { method: "DELETE" });
    if (res.ok) { onUpdated(); onClose(); }
  });

  const handleEditTransport = (details: TransportDetails, addedBy: string) => guard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, title: details.transport_name, added_by: addedBy, details }),
    });
    if (res.ok) { setEditing(false); onUpdated(); onClose(); }
  });

  const handleEditPlace = (details: PlaceDetails, addedBy: string) => guard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, title: details.name, added_by: addedBy, details }),
    });
    if (res.ok) { setEditing(false); onUpdated(); onClose(); }
  });

  const handleEditStay = (details: StayDetails, addedBy: string) => guard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, title: details.name, added_by: addedBy, details }),
    });
    if (res.ok) { setEditing(false); onUpdated(); onClose(); }
  });

  if (editing) {
    if (transport) {
      return (
        <ModalShell onClose={onClose} title="교통 일정 수정">
          <TransportForm initial={transport} participants={participants} initialAddedBy={item.added_by}
            tripStart={tripStart} tripEnd={tripEnd}
            onSubmit={handleEditTransport} onCancel={() => setEditing(false)} submitLabel="수정 완료" />
        </ModalShell>
      );
    }
    if (place) {
      return (
        <ModalShell onClose={onClose} title={`${CATEGORY_ICONS[item.category]} ${item.category} 수정`}>
          <PlaceForm category={item.category} initial={place} participants={participants}
            initialAddedBy={item.added_by} tripDates={tripDates}
            onSubmit={handleEditPlace} onCancel={() => setEditing(false)} submitLabel="수정 완료" />
        </ModalShell>
      );
    }
    if (stay) {
      return (
        <ModalShell onClose={onClose} title="🏨 숙박 수정">
          <StayForm initial={stay} participants={participants} initialAddedBy={item.added_by}
            tripStart={tripStart} tripEnd={tripEnd}
            onSubmit={handleEditStay} onCancel={() => setEditing(false)} submitLabel="수정 완료" />
        </ModalShell>
      );
    }
    return null;
  }

  const cost = getCost(item);

  return (
    <ModalShell onClose={onClose} title={`${CATEGORY_ICONS[item.category]} ${item.title}`}>
      <div className="space-y-3">
        {transport && (
          <>
            <InfoRow label="교통편" value={transport.transport_name} />
            <LocationRow label="출발" placeName={`${transport.departure_place.name} · ${transport.departure_time.replace("T", " ")}`} />
            <LocationRow label="도착" placeName={`${transport.arrival_place.name} · ${transport.arrival_time.replace("T", " ")}`} />
          </>
        )}
        {place && (
          <>
            <LocationRow label="위치" placeName={place.place.name} />
            {place.business_hours.length > 0 && (
              <div className="min-w-0">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">영업 시간</span>
                <div className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 space-y-0.5">
                  {place.business_hours.map((bh, i) => (
                    <div key={i}>{bh.date} {bh.start_time}~{bh.end_time}</div>
                  ))}
                </div>
              </div>
            )}
            {place.confirmed_slots.length > 0 && (
              <div className="min-w-0">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">확정 일정</span>
                <div className="text-sm text-green-700 dark:text-green-400 mt-0.5 space-y-0.5">
                  {place.confirmed_slots.map((s, i) => (
                    <div key={i}>{s.date} {s.start_time}~{s.end_time}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {stay && (
          <>
            <LocationRow label="위치" placeName={stay.place.name} />
            <InfoRow label="숙박 기간" value={`${stay.stay_start} ~ ${stay.stay_end}`} />
            <InfoRow label="체크인 / 체크아웃" value={`${stay.check_in_time} / ${stay.check_out_time}`} />
            {stay.confirmed_slots.length > 0 && (
              <div className="min-w-0">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">확정 일정</span>
                <div className="text-sm text-green-700 dark:text-green-400 mt-0.5 space-y-0.5">
                  {stay.confirmed_slots.map((s, i) => (
                    <div key={i}>{s.date} {s.start_time}~{s.end_time}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {cost > 0 && (
          <InfoRow label="비용"
            value={`총 ${cost.toLocaleString()}원 · 인당 ${Math.floor(cost / participants.length).toLocaleString()}원`} />
        )}
        <InfoRow label="추가자" value={item.added_by} />
        {transport?.notes && <NotesRow value={transport.notes} />}
        {place?.notes && <NotesRow value={place.notes} />}
        {stay?.notes && <NotesRow value={stay.notes} />}

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => setEditing(true)}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all">
            수정
          </button>
          <button onClick={handleDelete}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
            삭제
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

function LocationRow({ label, placeName }: { label: string; placeName: string }) {
  const handleClick = () => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(placeName)}`;
    window.open(url, "_blank");
  };
  return (
    <div className="min-w-0">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <p className="text-sm mt-0.5">
        <button onClick={handleClick}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline text-left break-words">
          {placeName}
        </button>
      </p>
    </div>
  );
}

function NotesRow({ value }: { value: string }) {
  // URL chars: letters, digits, and common URL special chars
  const urlRegex = /(https?:\/\/[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)/g;
  const parts = value.split(urlRegex);

  // Clean trailing punctuation/CJK that got captured
  const cleanUrl = (url: string): { href: string; trailing: string } => {
    // Strip trailing chars that are likely not part of the URL
    const trailingMatch = url.match(/[),;:.'"\]}>。，、]+$/);
    if (trailingMatch) {
      return {
        href: url.slice(0, -trailingMatch[0].length),
        trailing: trailingMatch[0],
      };
    }
    return { href: url, trailing: "" };
  };

  return (
    <div className="min-w-0">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">관련 정보</span>
      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          urlRegex.lastIndex = 0;
          if (urlRegex.test(part)) {
            const { href, trailing } = cleanUrl(part);
            return (
              <span key={i}>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 underline break-all">
                  {href}
                </a>
                {trailing}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    </div>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 truncate">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Panel ───
export default function WishlistPanel({
  scheduleId, participants, tripStart, tripEnd, isOpen, onClose, onConfirmChange, openItemId, onItemOpened,
}: WishlistPanelProps) {
  const [activeCategory, setActiveCategory] = useState<WishlistCategory>("관광지");
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailItem, setDetailItem] = useState<WishlistItem | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<WishlistItem | null>(null);

  const tripDates = getDatesInRange(tripStart, tripEnd);

  // Open item by ID from external (timeline click)
  useEffect(() => {
    if (!openItemId || !isOpen) return;
    (async () => {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}/wishlist`);
        if (res.ok) {
          const allItems: WishlistItem[] = await res.json();
          const found = allItems.find((i) => i.id === openItemId);
          if (found) setDetailItem(found);
        }
      } catch { /* silently fail */ }
      onItemOpened?.();
    })();
  }, [openItemId, isOpen, scheduleId, onItemOpened]);

  // Mouse drag scroll for tabs
  const tabsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const onMouseDown = (e: React.MouseEvent) => {
    const el = tabsRef.current;
    if (!el) return;
    isDragging.current = true; hasDragged.current = false;
    dragStartX.current = e.clientX; scrollStartX.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  };
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !tabsRef.current) return;
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 3) hasDragged.current = true;
      tabsRef.current.scrollLeft = scrollStartX.current - dx;
    };
    const onMouseUp = () => { isDragging.current = false; if (tabsRef.current) tabsRef.current.style.cursor = "grab"; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  // Cache: category → items, invalidated on mutations
  const cacheRef = useRef<Record<string, WishlistItem[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);

  const invalidateCache = () => { cacheRef.current = {}; };

  const fetchItems = useCallback(async () => {
    // Show cached immediately if available
    const cached = cacheRef.current[activeCategory];
    if (cached) {
      setItems(cached);
    } else {
      setLoadingItems(true);
    }
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/wishlist?category=${encodeURIComponent(activeCategory)}`);
      if (res.ok) {
        const data = await res.json();
        cacheRef.current[activeCategory] = data;
        setItems(data);
      }
    } catch { /* silently fail */ }
    setLoadingItems(false);
  }, [scheduleId, activeCategory]);

  useEffect(() => { if (isOpen) fetchItems(); }, [isOpen, fetchItems]);

  // ─── Add handlers ───
  const panelGuard = createGuard();

  const handleAddTransport = (details: TransportDetails, addedBy: string) => panelGuard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "교통", title: details.transport_name, added_by: addedBy, details }),
    });
    if (res.ok) { setShowAddModal(false); invalidateCache(); fetchItems(); }
  });

  const handleAddPlace = (details: PlaceDetails, addedBy: string) => panelGuard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeCategory, title: details.name, added_by: addedBy, details }),
    });
    if (res.ok) { setShowAddModal(false); invalidateCache(); fetchItems(); }
  });

  const handleAddStay = (details: StayDetails, addedBy: string) => panelGuard(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "숙박", title: details.name, added_by: addedBy, details }),
    });
    if (res.ok) { setShowAddModal(false); invalidateCache(); fetchItems(); }
  });

  // ─── Confirm toggle ───
  const handleConfirmClick = (item: WishlistItem) => panelGuard(async () => {
    const isPlace = PLACE_CATEGORIES.includes(item.category);
    const isStay = item.category === "숙박";

    if (isPlace || isStay) {
      if (item.confirmed) {
        await _unconfirmPlace(item);
      } else {
        setConfirmingItem(item);
      }
    } else {
      await _toggleConfirmSimple(item);
    }
  });

  const _toggleConfirmSimple = async (item: WishlistItem) => {
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, confirmed: !item.confirmed }),
    });
    if (res.ok) { invalidateCache(); fetchItems(); onConfirmChange?.(); }
  };

  const _unconfirmPlace = async (item: WishlistItem) => {
    const place = parsePlaceDetails(item);
    const stay = parseStayDetails(item);
    const details = place || stay;
    if (!details) return;
    const updated = { ...details, confirmed_slots: [] };
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, confirmed: false, details: updated }),
    });
    if (res.ok) { invalidateCache(); fetchItems(); onConfirmChange?.(); }
  };

  const handleConfirmPlace = (item: WishlistItem, slots: TimeBlock[]) => panelGuard(async () => {
    const place = parsePlaceDetails(item);
    const stay = parseStayDetails(item);
    const details = place || stay;
    if (!details) return;
    const updated = { ...details, confirmed_slots: slots };
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, confirmed: true, details: updated }),
    });
    if (res.ok) { setConfirmingItem(null); fetchItems(); onConfirmChange?.(); }
  });

  const isTransport = activeCategory === "교통";
  const isPlace = PLACE_CATEGORIES.includes(activeCategory);
  const isSukbak = activeCategory === "숙박";

  // Render item summary line
  const renderItemSummary = (item: WishlistItem) => {
    const transport = parseTransportDetails(item);
    const place = parsePlaceDetails(item);
    const stayD = parseStayDetails(item);
    const cost = getCost(item);

    return (
      <div className="flex-1 min-w-0" onClick={() => setDetailItem(item)}>
        <p className={`text-sm font-medium truncate ${item.confirmed ? "text-green-800 dark:text-green-300" : "text-gray-800 dark:text-gray-200"}`}>
          {item.title}
        </p>
        {transport && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{formatTransportSummary(transport)}</p>
        )}
        {place && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{formatPlaceSummary(place)}</p>
        )}
        {stayD && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{formatStaySummary(stayD)}</p>
        )}
        {cost > 0 && (
          <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">
            총 {cost.toLocaleString()}원 · 인당 {Math.floor(cost / participants.length).toLocaleString()}원
          </p>
        )}
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.added_by}</p>
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 md:bg-transparent" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl z-50
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">위시리스트</h2>
          <button onClick={onClose} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        <div ref={tabsRef} onMouseDown={onMouseDown}
          className="flex overflow-x-auto gap-1.5 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 scrollbar-hide cursor-grab">
          {WISHLIST_CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => { if (hasDragged.current) return; setActiveCategory(cat); }}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none ${
                activeCategory === cat ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}>
              <span>{CATEGORY_ICONS[cat]}</span>{cat}
            </button>
          ))}
          <div className="flex-shrink-0 w-1" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
              {loadingItems ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>불러오는 중...</span>
                </div>
              ) : "아직 추가된 항목이 없어요"}
            </div>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id}
                className={`rounded-lg px-3 py-2.5 group transition-all cursor-pointer ${
                  item.confirmed ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700" : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700"
                }`}>
                <div className="flex items-start gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleConfirmClick(item); }}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      item.confirmed ? "bg-green-50 dark:bg-green-900/300 border-green-500 text-white" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }`}>
                    {item.confirmed && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {renderItemSummary(item)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-500 text-white
              hover:bg-blue-600 active:bg-blue-700 transition-all flex items-center justify-center gap-1">
            <span className="text-lg leading-none">+</span>
            {CATEGORY_ICONS[activeCategory]} {activeCategory} 추가
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <ModalShell onClose={() => setShowAddModal(false)}
          title={`${CATEGORY_ICONS[activeCategory]} ${activeCategory} 추가`}>
          {isTransport ? (
            <TransportForm participants={participants} tripStart={tripStart} tripEnd={tripEnd}
              onSubmit={handleAddTransport} onCancel={() => setShowAddModal(false)} />
          ) : isPlace ? (
            <PlaceForm category={activeCategory} participants={participants} tripDates={tripDates}
              onSubmit={handleAddPlace} onCancel={() => setShowAddModal(false)} />
          ) : isSukbak ? (
            <StayForm participants={participants} tripStart={tripStart} tripEnd={tripEnd}
              onSubmit={handleAddStay} onCancel={() => setShowAddModal(false)} />
          ) : null}
        </ModalShell>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <ItemDetailModal item={detailItem} participants={participants} tripStart={tripStart} tripEnd={tripEnd}
          scheduleId={scheduleId} tripDates={tripDates}
          onClose={() => setDetailItem(null)} onUpdated={() => { invalidateCache(); fetchItems(); onConfirmChange?.(); }} />
      )}

      {/* Confirm Schedule Modal (place categories) */}
      {confirmingItem && (() => {
        const place = parsePlaceDetails(confirmingItem);
        const stayD = parseStayDetails(confirmingItem);

        // Determine available slots and initial slots
        let availSlots: TimeBlock[] = [];
        let initSlots: TimeBlock[] = [];

        if (place) {
          availSlots = place.business_hours;
          initSlots = place.confirmed_slots;
        } else if (stayD) {
          availSlots = stayAvailableSlots(stayD);
          initSlots = stayD.confirmed_slots;
        } else {
          return null;
        }

        return (
          <ConfirmScheduleModal
            scheduleId={scheduleId}
            tripDates={tripDates}
            businessHours={availSlots}
            initialSlots={initSlots}
            onConfirm={(slots) => handleConfirmPlace(confirmingItem, slots)}
            onCancel={() => setConfirmingItem(null)}
          />
        );
      })()}
    </>
  );
}
