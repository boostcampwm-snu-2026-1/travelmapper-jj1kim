"use client";

import { useState, useEffect, useCallback } from "react";
import { TimeBlock, ScheduleEvent } from "@/lib/types";
import DragTimeTable from "./DragTimeTable";

interface ConfirmScheduleModalProps {
  scheduleId: string;
  tripDates: string[];
  businessHours: TimeBlock[];
  initialSlots: TimeBlock[];
  onConfirm: (slots: TimeBlock[]) => void;
  onCancel: () => void;
}

export default function ConfirmScheduleModal({
  scheduleId,
  tripDates,
  businessHours,
  initialSlots,
  onConfirm,
  onCancel,
}: ConfirmScheduleModalProps) {
  const [slots, setSlots] = useState<TimeBlock[]>(initialSlots);
  const [existingEvents, setExistingEvents] = useState<TimeBlock[]>([]);

  // Fetch all existing events + confirmed wishlist to show as occupied
  const fetchExisting = useCallback(async () => {
    try {
      const [evRes, wishRes] = await Promise.all([
        fetch(`/api/schedules/${scheduleId}/events`),
        fetch(`/api/schedules/${scheduleId}/wishlist?confirmed=true`),
      ]);

      const events: TimeBlock[] = [];

      if (evRes.ok) {
        const evData: ScheduleEvent[] = await evRes.json();
        events.push(...evData.map((e) => ({
          date: e.date,
          start_time: e.start_time,
          end_time: e.end_time,
        })));
      }

      if (wishRes.ok) {
        const wishData = await wishRes.json();
        for (const item of wishData) {
          if (!item.details) continue;
          try {
            const d = typeof item.details === "string" ? JSON.parse(item.details) : item.details;

            // Transport items
            if (item.category === "교통" && d.departure_time && d.arrival_time) {
              const depDate = d.departure_time.split("T")[0];
              const depTime = d.departure_time.split("T")[1];
              const arrDate = d.arrival_time.split("T")[0];
              const arrTime = d.arrival_time.split("T")[1];
              if (depDate === arrDate) {
                events.push({ date: depDate, start_time: depTime, end_time: arrTime });
              } else {
                events.push({ date: depDate, start_time: depTime, end_time: "23:59" });
                events.push({ date: arrDate, start_time: "00:00", end_time: arrTime });
              }
            }

            // Place items with confirmed_slots
            if (d.confirmed_slots) {
              events.push(...(d.confirmed_slots as TimeBlock[]));
            }
          } catch { /* skip */ }
        }
      }

      setExistingEvents(events);
    } catch { /* silently fail */ }
  }, [scheduleId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">확정 일정 설정</h3>
          <button onClick={onCancel}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <div className="px-4 pt-2 text-[11px] text-gray-400 dark:text-gray-500 space-y-0.5">
          <p><span className="inline-block w-2.5 h-2.5 rounded bg-blue-200 mr-1 align-middle" />파란 영역 = 영업 시간 (드래그 가능)</p>
          <p><span className="inline-block w-2.5 h-2.5 rounded bg-gray-300 dark:bg-gray-600 mr-1 align-middle" />회색 영역 = 기존 일정 (겹침 불가)</p>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <DragTimeTable
            dates={tripDates}
            blocks={slots}
            onBlocksChange={setSlots}
            existingEvents={existingEvents}
            availableSlots={businessHours}
            blockColor="#F59E0B"
            availableColor="#DBEAFE"
            slotHeight={4}
          />
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => onConfirm(slots)}
            disabled={slots.length === 0}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              slots.length > 0
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-200 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}>
            확정하기 ({slots.length}개 블록)
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
