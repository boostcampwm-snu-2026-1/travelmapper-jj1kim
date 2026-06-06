"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ScheduleEvent, WishlistItem, TransportDetails, PlaceDetails, TimeBlock } from "@/lib/types";

interface SelectedTimeRange {
  date: string;
  startTime: string;
  endTime: string;
}

interface TimelineProps {
  scheduleId: string;
  tripStart: string;
  tripEnd: string;
  participants: string[];
  onChangeDates: () => void;
  onOpenWishlist: () => void;
  onWishlistItemClick?: (itemId: string) => void;
  onWhatToDo?: () => void;
  onFeasibility?: () => void;
  onFeasibilityCancel?: () => void;
  onMapView?: () => void;
  refreshKey?: number;
  whatToDoMode?: boolean;
  onWhatToDoSelect?: (range: SelectedTimeRange) => void;
  feasibilityMode?: boolean;
  onFeasibilitySelect?: (start: SelectedEventInfo, end: SelectedEventInfo) => void;
}

export interface SelectedEventInfo {
  eventId: string;   // wish-xxx...
  itemId: string;    // original wishlist item id
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

export type { SelectedTimeRange };

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

// Convert "HH:MM" to total minutes from 00:00
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (current <= last) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDateShort(dateStr: string): { day: string; weekday: string; monthDay: string } {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    day: String(d.getDate()),
    weekday: weekdays[d.getDay()],
    monthDay: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

const ALL_TIME_SLOTS = generateTimeSlots();
const VISIBLE_SLOTS = ALL_TIME_SLOTS;

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316",
];

export default function Timeline({
  scheduleId,
  tripStart,
  tripEnd,
  participants,
  onChangeDates,
  onOpenWishlist,
  onWishlistItemClick,
  onWhatToDo,
  onFeasibility,
  onFeasibilityCancel,
  onMapView,
  refreshKey,
  whatToDoMode,
  onWhatToDoSelect,
  feasibilityMode,
  onFeasibilitySelect,
}: TimelineProps) {
  const dates = getDatesInRange(tripStart, tripEnd);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<WishlistItem[]>([]);

  const fetchAllEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/events`);
      if (res.ok) setAllEvents(await res.json());
    } catch {
      // silently fail
    }
  }, [scheduleId]);

  const fetchConfirmed = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/schedules/${scheduleId}/wishlist?confirmed=true`
      );
      if (res.ok) setConfirmedItems(await res.json());
    } catch {
      // silently fail
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchAllEvents();
    fetchConfirmed();
  }, [fetchAllEvents, fetchConfirmed, refreshKey]);

  // Convert confirmed transport wishlist items to virtual events (minute-level)
  const confirmedEvents: ScheduleEvent[] = confirmedItems
    .filter((item) => item.category === "교통" && item.details)
    .flatMap((item) => {
      try {
        const d: TransportDetails =
          typeof item.details === "string"
            ? JSON.parse(item.details)
            : item.details;
        if (!d.departure_time || !d.arrival_time) return [];
        const depDate = d.departure_time.split("T")[0];
        const depTime = d.departure_time.split("T")[1]; // keep exact minutes
        const arrDate = d.arrival_time.split("T")[0];
        const arrTime = d.arrival_time.split("T")[1];

        if (depDate === arrDate) {
          const endTime = arrTime <= depTime ? "23:59" : arrTime;
          return [{
            id: `wish-${item.id}`,
            schedule_id: item.schedule_id,
            date: depDate,
            start_time: depTime,
            end_time: endTime,
            title: `🚗 ${item.title}`,
            description: `${d.departure_place.name} → ${d.arrival_place.name}`,
            participant: item.added_by,
            color: "#6366F1",
            created_at: item.created_at,
            updated_at: item.created_at,
          }];
        }

        const events: ScheduleEvent[] = [
          {
            id: `wish-${item.id}-dep`,
            schedule_id: item.schedule_id,
            date: depDate,
            start_time: depTime,
            end_time: "23:59",
            title: `🚗 ${item.title}`,
            description: `${d.departure_place.name} →`,
            participant: item.added_by,
            color: "#6366F1",
            created_at: item.created_at,
            updated_at: item.created_at,
          },
        ];

        // Fill in-between days
        const cur = new Date(depDate + "T00:00:00");
        cur.setDate(cur.getDate() + 1);
        const arrDateObj = new Date(arrDate + "T00:00:00");
        let midIdx = 0;
        while (cur < arrDateObj) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const dd = String(cur.getDate()).padStart(2, "0");
          events.push({
            id: `wish-${item.id}-mid${midIdx++}`,
            schedule_id: item.schedule_id,
            date: `${y}-${m}-${dd}`,
            start_time: "00:00",
            end_time: "23:59",
            title: `🚗 ${item.title}`,
            description: `${d.departure_place.name} → ${d.arrival_place.name}`,
            participant: item.added_by,
            color: "#6366F1",
            created_at: item.created_at,
            updated_at: item.created_at,
          });
          cur.setDate(cur.getDate() + 1);
        }

        events.push({
          id: `wish-${item.id}-arr`,
          schedule_id: item.schedule_id,
          date: arrDate,
          start_time: "00:00",
          end_time: arrTime,
          title: `🚗 ${item.title}`,
          description: `→ ${d.arrival_place.name}`,
          participant: item.added_by,
          color: "#6366F1",
          created_at: item.created_at,
          updated_at: item.created_at,
        });

        return events;
      } catch {
        return [];
      }
    });

  // Convert confirmed place items (식사/카페/관광지) to virtual events
  const PLACE_COLORS: Record<string, string> = {
    "식사": "#F97316",
    "카페&디저트": "#EC4899",
    "관광지": "#10B981",
    "숙박": "#8B5CF6",
  };

  const confirmedPlaceEvents: ScheduleEvent[] = confirmedItems
    .filter((item) => item.category !== "교통" && item.details)
    .flatMap((item) => {
      try {
        const d: PlaceDetails =
          typeof item.details === "string" ? JSON.parse(item.details) : item.details;
        if (!d.confirmed_slots?.length) return [];
        return d.confirmed_slots.map((slot: TimeBlock, i: number) => ({
          id: `wish-${item.id}-slot${i}`,
          schedule_id: item.schedule_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          title: `${item.category === "식사" ? "🍽️" : item.category === "카페&디저트" ? "☕" : item.category === "관광지" ? "📍" : "🏨"} ${item.title}`,
          description: d.place.name,
          participant: item.added_by,
          color: PLACE_COLORS[item.category] || "#6366F1",
          created_at: item.created_at,
          updated_at: item.created_at,
        }));
      } catch {
        return [];
      }
    });

  const allEventsWithConfirmed = [...allEvents, ...confirmedEvents, ...confirmedPlaceEvents];

  const eventsForDate = (date: string) =>
    allEventsWithConfirmed.filter((e) => e.date === date);

  // Overview slot height in px
  const OVERVIEW_SLOT_H = 36;
  const DAY_SLOT_H = 44;
  const SNAP_MIN = 10;

  // Feasibility mode: select start/end confirmed events
  const [feasStartEvent, setFeasStartEvent] = useState<string | null>(null);

  const handleFeasibilityClick = (event: { id: string; date: string; start_time: string; end_time: string; title: string }) => {
    if (!feasibilityMode || !event.id.startsWith("wish-")) return;
    const itemId = event.id.replace("wish-", "").replace(/-dep$|-arr$|-mid\d+$|-slot\d+$/, "");
    const info: SelectedEventInfo = {
      eventId: event.id,
      itemId,
      date: event.date,
      startTime: event.start_time,
      endTime: event.end_time,
      title: event.title,
    };

    if (!feasStartEvent) {
      setFeasStartEvent(event.id);
    } else {
      // Find start event info
      const startEvt = allEventsWithConfirmed.find((e) => e.id === feasStartEvent);
      if (!startEvt) { setFeasStartEvent(null); return; }

      const startItemId = feasStartEvent.replace("wish-", "").replace(/-dep$|-arr$|-mid\d+$|-slot\d+$/, "");
      const startInfo: SelectedEventInfo = {
        eventId: feasStartEvent,
        itemId: startItemId,
        date: startEvt.date,
        startTime: startEvt.start_time,
        endTime: startEvt.end_time,
        title: startEvt.title,
      };

      // Validate: start must be before end (no swap, just reject)
      const startIsBefore = startEvt.date < event.date ||
        (startEvt.date === event.date && timeToMinutes(startEvt.end_time) <= timeToMinutes(event.start_time));

      if (startIsBefore) {
        onFeasibilitySelect?.(startInfo, info);
        setFeasStartEvent(null);
      } else {
        // Invalid order: reset and treat this click as new start
        setFeasStartEvent(event.id);
      }
    }
  };

  // Reset feasibility selection when mode changes
  useEffect(() => {
    if (!feasibilityMode) setFeasStartEvent(null);
  }, [feasibilityMode]);

  const isActiveMode = whatToDoMode || feasibilityMode;
  const wtdDraggedRef = useRef(false);

  // What-to-do drag state
  const overviewRef = useRef<HTMLDivElement>(null);
  const [wtdDrag, setWtdDrag] = useState<{
    date: string;
    startMin: number;
    currentMin: number;
  } | null>(null);

  const getOverviewDateAndMin = useCallback(
    (clientX: number, clientY: number): { date: string; min: number } | null => {
      if (!overviewRef.current) return null;
      const rect = overviewRef.current.getBoundingClientRect();
      const scrollTop = overviewRef.current.scrollTop;
      const headerH = 36; // sticky header height
      const timeLabelW = 56; // w-14 = 56px
      const x = clientX - rect.left - timeLabelW;
      const y = clientY - rect.top + scrollTop - headerH;
      if (x < 0 || y < 0) return null;

      const colWidth = (rect.width - timeLabelW) / dates.length;
      const colIdx = Math.floor(x / colWidth);
      if (colIdx < 0 || colIdx >= dates.length) return null;

      const rawMin = (y / (VISIBLE_SLOTS.length * OVERVIEW_SLOT_H)) * 24 * 60;
      const snapped = Math.round(rawMin / SNAP_MIN) * SNAP_MIN;
      return { date: dates[colIdx], min: Math.max(0, Math.min(1440, snapped)) };
    },
    [dates, OVERVIEW_SLOT_H]
  );

  function minToTimeStr(m: number): string {
    const c = Math.max(0, Math.min(1440, m));
    return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
  }

  // Check if a time range overlaps any event on that date
  function rangeHitsEvent(date: string, lo: number, hi: number): boolean {
    return allEventsWithConfirmed.some((e) => {
      if (e.date !== date) return false;
      const eStart = timeToMinutes(e.start_time);
      const eEnd = timeToMinutes(e.end_time);
      return lo < eEnd && hi > eStart;
    });
  }

  // Calculate confirmed cost per category
  const costByCategory: Record<string, number> = {};
  let totalConfirmedCost = 0;
  for (const item of confirmedItems) {
    if (!item.details) continue;
    try {
      const d = typeof item.details === "string" ? JSON.parse(item.details) : item.details;
      const c = d.cost || 0;
      if (c > 0) {
        costByCategory[item.category] = (costByCategory[item.category] || 0) + c;
        totalConfirmedCost += c;
      }
    } catch { /* skip */ }
  }
  const perPersonCost =
    participants.length > 0 ? Math.floor(totalConfirmedCost / participants.length) : 0;

  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const costBadgeRef = useRef<HTMLButtonElement>(null);

  // Close breakdown on outside click
  useEffect(() => {
    if (!showCostBreakdown) return;
    const handler = (e: MouseEvent) => {
      if (costBadgeRef.current && !costBadgeRef.current.contains(e.target as Node)) {
        setShowCostBreakdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCostBreakdown]);

  const categoryIcons: Record<string, string> = {
    "교통": "🚗", "숙박": "🏨", "식사": "🍽️", "카페&디저트": "☕", "관광지": "📍",
  };

  // ─── Overview: all dates at once ───
  if (!selectedDate) {
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 mb-2 px-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={onOpenWishlist}
            disabled={isActiveMode}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded bg-gray-800 text-white
              hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            위시리스트
          </button>
          <button
            onClick={onMapView}
            disabled={isActiveMode}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/40"
          >
            한눈에 보기
          </button>
          <button
            onClick={onWhatToDo}
            disabled={feasibilityMode}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              whatToDoMode
                ? "bg-amber-500 text-white"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40"
            }`}
          >
            이때 뭐하지?
          </button>
          <button
            onClick={onFeasibility}
            disabled={whatToDoMode}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              feasibilityMode
                ? "bg-violet-500 text-white"
                : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40"
            }`}
          >
            경로 조회
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">여행 일정표</h2>
            {perPersonCost > 0 && (
              <span className="relative inline-block">
                <button
                  ref={costBadgeRef}
                  onClick={() => setShowCostBreakdown((v) => !v)}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium
                    hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  인당 {perPersonCost.toLocaleString()}원
                </button>
                {showCostBreakdown && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 bg-gray-900/90 text-white
                    rounded-lg px-4 py-2.5 text-xs min-w-[220px] shadow-lg backdrop-blur-sm">
                    <div className="font-medium mb-1.5 text-gray-300 dark:text-gray-600">카테고리별 인당 비용</div>
                    <div className="space-y-1">
                      {Object.entries(costByCategory).map(([cat, total]) => (
                        <div key={cat} className="flex justify-between gap-3">
                          <span>{categoryIcons[cat] || ""} {cat}</span>
                          <span className="font-medium">
                            {Math.floor(total / participants.length).toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-600 mt-1.5 pt-1.5 flex justify-between font-medium">
                      <span>합계</span>
                      <span>{perPersonCost.toLocaleString()}원</span>
                    </div>
                  </div>
                )}
              </span>
            )}
          </div>
          <button
            onClick={onChangeDates}
            className="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
          >
            기간 변경
          </button>
        </div>

        {/* What-to-do hint */}
        {whatToDoMode && !wtdDrag && (
          <div className="mb-2 px-1 text-xs text-blue-600 dark:text-blue-400 animate-pulse">
            빈 시간대를 드래그해서 선택하세요
          </div>
        )}
        {/* Feasibility hint */}
        {feasibilityMode && (
          <div className="mb-2 px-1 text-xs text-violet-600 dark:text-violet-400 animate-pulse">
            {feasStartEvent
              ? "도착 일정을 선택하세요"
              : "출발 일정을 선택하세요 (두 일정 사이 경로를 조회합니다)"}
          </div>
        )}

        {/* Overview grid */}
        <div ref={overviewRef}
          className={`flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${whatToDoMode ? "touch-none" : ""}`}
          onPointerDown={(e) => {
            if (!whatToDoMode) return;
            const pos = getOverviewDateAndMin(e.clientX, e.clientY);
            if (!pos) return;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            wtdDraggedRef.current = true;
            setWtdDrag({ date: pos.date, startMin: pos.min, currentMin: pos.min });
          }}
          onPointerMove={(e) => {
            if (!whatToDoMode || !wtdDrag) return;
            const pos = getOverviewDateAndMin(e.clientX, e.clientY);
            if (!pos || pos.date !== wtdDrag.date) return;
            setWtdDrag((prev) => prev ? { ...prev, currentMin: pos.min } : null);
          }}
          onPointerUp={() => {
            if (!whatToDoMode || !wtdDrag) return;
            const lo = Math.min(wtdDrag.startMin, wtdDrag.currentMin);
            const hi = Math.max(wtdDrag.startMin, wtdDrag.currentMin);
            if (hi - lo >= SNAP_MIN && !rangeHitsEvent(wtdDrag.date, lo, hi)) {
              onWhatToDoSelect?.({
                date: wtdDrag.date,
                startTime: minToTimeStr(lo),
                endTime: minToTimeStr(hi),
              });
            }
            setWtdDrag(null);
          }}>
          {/* Sticky header row */}
          <div className="flex sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
            {/* Time column header */}
            <div className="w-14 flex-shrink-0" />
            {/* Date columns */}
            {dates.map((date) => {
              const { day, weekday } = formatDateShort(date);
              const dayOfWeek = new Date(date + "T00:00:00").getDay();
              return (
                <button
                  key={date}
                  onClick={() => { if (wtdDraggedRef.current) { wtdDraggedRef.current = false; return; } if (feasibilityMode) { onFeasibilityCancel?.(); } else if (!isActiveMode) { setSelectedDate(date); } }}
                  className={`flex-1 min-w-[80px] py-2 text-center border-l border-gray-200 dark:border-gray-700
                    transition-colors ${isActiveMode ? "" : "hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"}`}
                >
                  <div className={`text-[10px] font-medium ${
                    dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {weekday}
                  </div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{day}</div>
                </button>
              );
            })}
          </div>

          {/* Time grid + events overlay */}
          <div className="flex">
            {/* Time labels column */}
            <div className="w-14 flex-shrink-0">
              {VISIBLE_SLOTS.map((time) => {
                const isHour = time.endsWith(":00");
                return (
                  <div key={time} style={{ height: OVERVIEW_SLOT_H }}
                    className={`flex items-center justify-end pr-2 text-[11px] ${
                      isHour ? "text-gray-400 dark:text-gray-500 font-medium" : "text-transparent"
                    }`}>
                    {time}
                  </div>
                );
              })}
            </div>

            {/* Date columns with grid lines + absolute events */}
            {dates.map((date) => {
              const dayEvts = eventsForDate(date);
              return (
                <div key={date} className={`flex-1 min-w-[80px] border-l border-gray-100 dark:border-gray-700 relative ${isActiveMode ? "" : "cursor-pointer"}`}
                  onClick={() => { if (wtdDraggedRef.current) { wtdDraggedRef.current = false; return; } if (feasibilityMode) { onFeasibilityCancel?.(); } else if (!isActiveMode) { setSelectedDate(date); } }}
                  style={{ height: VISIBLE_SLOTS.length * OVERVIEW_SLOT_H }}>
                  {/* Grid lines */}
                  {VISIBLE_SLOTS.map((time) => {
                    const isHalfHour = time.endsWith(":30");
                    return (
                      <div key={time} style={{ height: OVERVIEW_SLOT_H }}
                        className={`border-b ${isHalfHour ? "border-gray-200 dark:border-gray-700" : "border-gray-50 dark:border-gray-800"}`} />
                    );
                  })}
                  {/* Events overlay */}
                  {dayEvts.map((event) => {
                    const startMin = timeToMinutes(event.start_time);
                    const endMin = timeToMinutes(event.end_time);
                    const durationMin = Math.max(endMin - startMin, 10);
                    const top = (startMin / 30) * OVERVIEW_SLOT_H;
                    const height = (durationMin / 30) * OVERVIEW_SLOT_H;
                    const isWishEvent = event.id.startsWith("wish-");

                    const isFeasSelected = feasibilityMode && feasStartEvent === event.id;

                    return (
                      <div key={event.id}
                        onClick={(e) => {
                          if (whatToDoMode) { e.stopPropagation(); return; }
                          if (feasibilityMode && isWishEvent) {
                            e.stopPropagation();
                            handleFeasibilityClick(event);
                            return;
                          }
                          if (isWishEvent && onWishlistItemClick) {
                            e.stopPropagation();
                            onWishlistItemClick(event.id.replace("wish-", "").replace(/-dep$|-arr$|-mid\d+$|-slot\d+$/, ""));
                          }
                        }}
                        className={`absolute left-0.5 right-0.5 rounded text-sm text-white font-medium px-1 py-0.5
                          leading-snug break-words overflow-hidden
                          ${isWishEvent && !isActiveMode ? "cursor-pointer z-10" : ""}
                          ${feasibilityMode && isWishEvent ? "cursor-pointer z-10 hover:ring-2 hover:ring-violet-400" : ""}
                          ${isFeasSelected ? "ring-2 ring-yellow-400" : ""}
                          ${whatToDoMode ? "pointer-events-none" : ""}`}
                        style={{
                          top,
                          height: Math.max(height, 14),
                          backgroundColor: event.color || COLORS[0],
                        }}>
                        {event.title}
                      </div>
                    );
                  })}

                  {/* What-to-do drag preview */}
                  {wtdDrag && wtdDrag.date === date && (() => {
                    const lo = Math.min(wtdDrag.startMin, wtdDrag.currentMin);
                    const hi = Math.max(wtdDrag.startMin, wtdDrag.currentMin);
                    const top = (lo / 30) * OVERVIEW_SLOT_H;
                    const height = ((hi - lo) / 30) * OVERVIEW_SLOT_H;
                    if (height < 2) return null;
                    const hitsEvent = rangeHitsEvent(date, lo, hi);
                    return (
                      <>
                        <div className={`absolute left-0.5 right-0.5 rounded pointer-events-none ${
                          hitsEvent ? "bg-red-400/40" : "bg-amber-400/50"
                        }`} style={{ top, height }} />
                        <div className="absolute left-1/2 -translate-x-1/2 z-30 bg-gray-900/85 text-white
                          text-[10px] px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm pointer-events-none"
                          style={{ top: top - 22 }}>
                          {minToTimeStr(lo)} ~ {minToTimeStr(hi)}
                          {hitsEvent && <span className="text-red-300 ml-1">겹침</span>}
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // ─── Day detail view ───
  const dayEvents = eventsForDate(selectedDate);

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <button
          onClick={() => setSelectedDate(null)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          {formatDateFull(selectedDate)}
        </h2>
      </div>

      {/* Day timeline */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0">
            {VISIBLE_SLOTS.map((time) => {
              const isHour = time.endsWith(":00");
              return (
                <div key={time} style={{ height: DAY_SLOT_H }}
                  className={`flex items-center justify-end pr-3 text-xs ${
                    isHour ? "text-gray-500 dark:text-gray-400 font-medium" : "text-gray-300 dark:text-gray-600"
                  }`}>
                  {time}
                </div>
              );
            })}
          </div>

          {/* Event area with grid + absolute events */}
          <div className="flex-1 border-l border-gray-200 dark:border-gray-700 relative"
            style={{ height: VISIBLE_SLOTS.length * DAY_SLOT_H }}>
            {/* Grid lines */}
            {VISIBLE_SLOTS.map((time) => {
              const isHalfHour = time.endsWith(":30");
              return (
                <div key={time} style={{ height: DAY_SLOT_H }}
                  className={`border-b ${isHalfHour ? "border-gray-200 dark:border-gray-700" : "border-gray-50 dark:border-gray-800"}`} />
              );
            })}
            {/* Events */}
            {dayEvents.map((event) => {
              const startMin = timeToMinutes(event.start_time);
              const endMin = timeToMinutes(event.end_time);
              const durationMin = Math.max(endMin - startMin, 10);
              const top = (startMin / 30) * DAY_SLOT_H;
              const height = (durationMin / 30) * DAY_SLOT_H;
              const isWishEvent = event.id.startsWith("wish-");

              return (
                <div key={event.id}
                  onClick={() => {
                    if (isWishEvent && onWishlistItemClick) {
                      onWishlistItemClick(event.id.replace("wish-", "").replace(/-dep$|-arr$|-mid\d+$|-slot\d+$/, ""));
                    }
                  }}
                  className={`absolute left-2 right-2 rounded-md px-2.5 py-1.5 text-base text-white font-medium
                    overflow-hidden ${isWishEvent ? "cursor-pointer" : ""}`}
                  style={{
                    top,
                    height: Math.max(height, 24),
                    backgroundColor: event.color || COLORS[0],
                  }}>
                  <div className="font-semibold">{event.title}</div>
                  {height >= 48 && event.description && (
                    <div className="opacity-80 text-sm mt-0.5">{event.description}</div>
                  )}
                  {height >= 68 && event.participant && (
                    <div className="opacity-70 text-sm mt-0.5">{event.participant}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dayEvents.length === 0 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          아직 등록된 일정이 없습니다
        </div>
      )}
    </div>
  );
}
