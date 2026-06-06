"use client";

import { useState, useEffect, useCallback } from "react";
import { createGuard } from "@/lib/guard";
import {
  WishlistItem,
  WishlistCategory,
  PlaceDetails,
  TimeBlock,
} from "@/lib/types";
import { parsePlaceDetails } from "./WishlistPanel";
import ConfirmScheduleModal from "./ConfirmScheduleModal";
import type { SelectedTimeRange } from "./Timeline";

interface WhatToDoPanelProps {
  scheduleId: string;
  participants: string[];
  tripDates: string[];
  selectedRange: SelectedTimeRange;
  isOpen: boolean;
  onClose: () => void;
  onConfirmChange?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  "식사": "🍽️", "카페&디저트": "☕", "관광지": "📍",
};

const TARGET_CATEGORIES: WishlistCategory[] = ["식사", "카페&디저트", "관광지"];

function formatDateFull(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const wd = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${wd[dt.getDay()]})`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hasOverlap30Min(
  item: WishlistItem,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  const place = parsePlaceDetails(item);
  if (!place || !place.business_hours.length) return false;
  const selStart = timeToMin(startTime);
  const selEnd = timeToMin(endTime);
  return place.business_hours.some((bh) => {
    if (bh.date !== date) return false;
    const bhStart = timeToMin(bh.start_time);
    const bhEnd = timeToMin(bh.end_time);
    const overlapStart = Math.max(selStart, bhStart);
    const overlapEnd = Math.min(selEnd, bhEnd);
    return overlapEnd - overlapStart >= 30;
  });
}

// Detail modal (read-only, no edit/delete)
function ItemDetailReadonly({
  item,
  participants,
  onClose,
}: {
  item: WishlistItem;
  participants: string[];
  onClose: () => void;
}) {
  const place = parsePlaceDetails(item);
  const cost = place?.cost || 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 truncate">
            {CATEGORY_ICONS[item.category] || ""} {item.title}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
          {place && (
            <>
              <InfoRow label="위치" value={place.place.name} />
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
            </>
          )}
          {cost > 0 && (
            <InfoRow label="비용"
              value={`총 ${cost.toLocaleString()}원 · 인당 ${Math.floor(cost / participants.length).toLocaleString()}원`} />
          )}
          <InfoRow label="추가자" value={item.added_by} />
          {place?.notes && <InfoRow label="관련 정보" value={place.notes} />}
        </div>
      </div>
    </div>
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

export default function WhatToDoPanel({
  scheduleId,
  participants,
  tripDates,
  selectedRange,
  isOpen,
  onClose,
  onConfirmChange,
}: WhatToDoPanelProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [detailItem, setDetailItem] = useState<WishlistItem | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<WishlistItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const results: WishlistItem[] = [];
      for (const cat of TARGET_CATEGORIES) {
        const res = await fetch(
          `/api/schedules/${scheduleId}/wishlist?category=${encodeURIComponent(cat)}`
        );
        if (res.ok) {
          const data: WishlistItem[] = await res.json();
          results.push(...data);
        }
      }
      const filtered = results.filter((item) =>
        hasOverlap30Min(item, selectedRange.date, selectedRange.startTime, selectedRange.endTime)
      );
      setItems(filtered);
    } catch { /* silently fail */ }
    setLoadingItems(false);
  }, [scheduleId, selectedRange]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  const wtdGuard = createGuard();

  const handleToggleConfirm = (item: WishlistItem) => wtdGuard(async () => {
    const place = parsePlaceDetails(item);
    if (!place) return;

    if (item.confirmed) {
      const updated = { ...place, confirmed_slots: [] };
      await fetch(`/api/schedules/${scheduleId}/wishlist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, confirmed: false, details: updated }),
      });
      fetchItems();
      onConfirmChange?.();
    } else {
      setConfirmingItem(item);
    }
  });

  const handleConfirmPlace = (item: WishlistItem, slots: TimeBlock[]) => wtdGuard(async () => {
    const place = parsePlaceDetails(item);
    if (!place) return;
    const updated = { ...place, confirmed_slots: slots };
    const res = await fetch(`/api/schedules/${scheduleId}/wishlist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, confirmed: true, details: updated }),
    });
    if (res.ok) {
      setConfirmingItem(null);
      fetchItems();
      onConfirmChange?.();
    }
  });

  // Group by category
  const grouped: Record<string, WishlistItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <>
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl z-50
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm font-bold text-amber-600 mb-1">
            {formatDateFull(selectedRange.date)} {selectedRange.startTime} ~ {selectedRange.endTime}
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">이 시간에 할 수 있는 것들</h2>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingItems && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">일정을 찾고 있어요...</span>
            </div>
          )}
          {!loadingItems && items.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
              이 시간대에 가능한 일정이 없어요.<br />
              <span className="text-xs text-gray-300 mt-1 block">위시리스트에 영업 시간을 등록해보세요</span>
            </div>
          )}

          {TARGET_CATEGORIES.map((cat) => {
            const catItems = grouped[cat];
            if (!catItems?.length) return null;
            return (
              <div key={cat} className="mb-4">
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">
                  {CATEGORY_ICONS[cat]} {cat}
                </div>
                <div className="space-y-1.5">
                  {catItems.map((item) => {
                    const place = parsePlaceDetails(item);
                    const cost = place?.cost || 0;
                    return (
                      <div key={item.id}
                        className={`rounded-lg px-3 py-2 transition-all ${
                          item.confirmed ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700" : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}>
                        <div className="flex items-start gap-2">
                          {/* Confirm checkbox */}
                          <button onClick={() => handleToggleConfirm(item)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              item.confirmed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                            }`}>
                            {item.confirmed && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailItem(item)}>
                            <p className={`text-sm font-medium truncate ${
                              item.confirmed ? "text-green-800 dark:text-green-300" : "text-gray-800 dark:text-gray-200"
                            }`}>{item.title}</p>
                            {cost > 0 && (
                              <p className="text-[11px] text-blue-500 dark:text-blue-400">
                                인당 {Math.floor(cost / participants.length).toLocaleString()}원
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.added_by}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-white
              hover:bg-gray-700 transition-all">
            확인
          </button>
        </div>
      </div>

      {/* Detail modal (read-only) */}
      {detailItem && (
        <ItemDetailReadonly
          item={detailItem}
          participants={participants}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Confirm schedule modal */}
      {confirmingItem && (() => {
        const place = parsePlaceDetails(confirmingItem);
        if (!place) return null;
        return (
          <ConfirmScheduleModal
            scheduleId={scheduleId}
            tripDates={tripDates}
            businessHours={place.business_hours}
            initialSlots={place.confirmed_slots}
            onConfirm={(slots) => handleConfirmPlace(confirmingItem, slots)}
            onCancel={() => setConfirmingItem(null)}
          />
        );
      })()}
    </>
  );
}
