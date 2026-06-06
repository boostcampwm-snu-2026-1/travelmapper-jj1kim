"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { TimeBlock } from "@/lib/types";

interface DragTimeTableProps {
  dates: string[];
  blocks: TimeBlock[];
  onBlocksChange: (blocks: TimeBlock[]) => void;
  existingEvents?: TimeBlock[];
  availableSlots?: TimeBlock[];
  snapMinutes?: number;
  slotHeight?: number;
  startHour?: number;
  endHour?: number;
  blockColor?: string;
  availableColor?: string;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minToTime(m: number): string {
  const clamped = Math.max(0, Math.min(1440, m));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function formatDateHeader(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const wd = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dt.getMonth() + 1}/${dt.getDate()} ${wd[dt.getDay()]}`;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.date === b.date && a.start_time < b.end_time && a.end_time > b.start_time;
}

function isWithinAvailable(
  date: string, startMin: number, endMin: number, available: TimeBlock[]
): boolean {
  const s = minToTime(startMin);
  const e = minToTime(endMin);
  return available.some(
    (a) => a.date === date && s >= a.start_time && e <= a.end_time
  );
}

export default function DragTimeTable({
  dates,
  blocks,
  onBlocksChange,
  existingEvents = [],
  availableSlots,
  snapMinutes = 10,
  slotHeight = 4,
  startHour = 0,
  endHour = 24,
  blockColor = "#3B82F6",
  availableColor = "#DBEAFE",
}: DragTimeTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    date: string;
    startMin: number;
    currentMin: number;
  } | null>(null);
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  const totalSlots = ((endHour - startHour) * 60) / snapMinutes;
  const totalHeight = totalSlots * slotHeight;
  const startOffset = startHour * 60;

  const gridLines: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    gridLines.push(h * 60);
    gridLines.push(h * 60 + 30);
  }

  const getTimeFromY = useCallback(
    (y: number): number => {
      const rawMin = startOffset + (y / totalHeight) * (endHour - startHour) * 60;
      return Math.round(rawMin / snapMinutes) * snapMinutes;
    },
    [startOffset, totalHeight, endHour, startHour, snapMinutes]
  );

  const getYFromMin = useCallback(
    (min: number): number => {
      return ((min - startOffset) / ((endHour - startHour) * 60)) * totalHeight;
    },
    [startOffset, endHour, startHour, totalHeight]
  );

  const getDateAndY = useCallback(
    (clientX: number, clientY: number): { date: string; min: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop;
      const headerH = 32 + 12; // header + spacer
      const timeLabelW = 40;
      const x = clientX - rect.left - timeLabelW;
      const y = clientY - rect.top + scrollTop - headerH;
      if (x < 0) return null;
      const clampedY = Math.max(0, y); // spacer area → treat as 0:00

      const colWidth = (rect.width - timeLabelW) / dates.length;
      const colIdx = Math.floor(x / colWidth);
      if (colIdx < 0 || colIdx >= dates.length) return null;

      const min = getTimeFromY(clampedY);
      return { date: dates[colIdx], min: Math.max(startOffset, Math.min(endHour * 60, min)) };
    },
    [dates, getTimeFromY, startOffset, endHour]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // prevent browser default drag behavior
    // Close tooltip on any tap
    setTooltipIdx(null);

    const pos = getDateAndY(e.clientX, e.clientY);
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ date: pos.date, startMin: pos.min, currentMin: pos.min });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const pos = getDateAndY(e.clientX, e.clientY);
    if (!pos || pos.date !== dragState.date) return;
    setDragState((prev) => prev ? { ...prev, currentMin: pos.min } : null);
  };

  const handlePointerUp = () => {
    if (!dragState) return;
    const lo = Math.min(dragState.startMin, dragState.currentMin);
    const hi = Math.max(dragState.startMin, dragState.currentMin);
    if (hi - lo >= snapMinutes) {
      const newBlock: TimeBlock = {
        date: dragState.date,
        start_time: minToTime(lo),
        end_time: minToTime(hi),
      };

      // Check: no overlap with existing events
      const hitsExisting = existingEvents.some((ev) => blocksOverlap(newBlock, ev));
      // Check: no overlap with other user blocks
      const hitsOwnBlocks = blocks.some((b) => blocksOverlap(newBlock, b));
      // Check: within available slots
      const withinAvail = !availableSlots || isWithinAvailable(dragState.date, lo, hi, availableSlots);

      if (!hitsExisting && !hitsOwnBlocks && withinAvail) {
        onBlocksChange([...blocks, newBlock]);
      }
    }
    setDragState(null);
  };

  const removeBlock = (idx: number) => {
    onBlocksChange(blocks.filter((_, i) => i !== idx));
    setTooltipIdx(null);
  };

  // Close tooltip on outside click
  useEffect(() => {
    if (tooltipIdx === null) return;
    const handler = () => setTooltipIdx(null);
    const timer = setTimeout(() => document.addEventListener("pointerdown", handler, { once: true }), 0);
    return () => clearTimeout(timer);
  }, [tooltipIdx]);

  // Scroll to ~8:00 on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollTo = getYFromMin(8 * 60);
      containerRef.current.scrollTop = scrollTo - 20;
    }
  }, [getYFromMin]);

  return (
    <div
      ref={containerRef}
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto bg-white dark:bg-gray-800 select-none touch-none"
      style={{ maxHeight: 400 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Header */}
      <div className="flex sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600" style={{ height: 32 }}>
        <div className="flex-shrink-0" style={{ width: 40 }} />
        {dates.map((d) => (
          <div key={d} className="flex-1 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center border-l border-gray-200 dark:border-gray-700">
            {formatDateHeader(d)}
          </div>
        ))}
      </div>

      {/* Body — pt-3 for easier 00:00 selection */}
      <div className="flex pt-3" style={{ height: totalHeight + 12 }}>
        {/* Time labels */}
        <div className="flex-shrink-0 relative" style={{ width: 40, height: totalHeight }}>
          {gridLines.filter((m) => m % 60 === 0).map((m) => (
            <div key={m} className="absolute right-1 text-[10px] text-gray-400 dark:text-gray-500" style={{ top: getYFromMin(m) - 6 }}>
              {minToTime(m)}
            </div>
          ))}
        </div>

        {/* Date columns */}
        {dates.map((date) => (
          <div key={date} className="flex-1 border-l border-gray-200 dark:border-gray-700 relative" style={{ height: totalHeight }}>
            {/* 30-min grid lines */}
            {gridLines.map((m) => (
              <div key={m} className={`absolute left-0 right-0 border-b ${m % 60 === 0 ? "border-gray-200 dark:border-gray-700" : "border-gray-50 dark:border-gray-800"}`}
                style={{ top: getYFromMin(m) }} />
            ))}

            {/* Available slots highlight */}
            {availableSlots?.filter((s) => s.date === date).map((s, i) => {
              const top = getYFromMin(timeToMin(s.start_time));
              const bot = getYFromMin(timeToMin(s.end_time));
              return (
                <div key={`avail-${i}`} className="absolute left-0 right-0 pointer-events-none"
                  style={{ top, height: bot - top, backgroundColor: availableColor, opacity: 0.5 }} />
              );
            })}

            {/* Existing events (grey) */}
            {existingEvents.filter((ev) => ev.date === date).map((ev, i) => {
              const top = getYFromMin(timeToMin(ev.start_time));
              const bot = getYFromMin(timeToMin(ev.end_time));
              return (
                <div key={`exist-${i}`} className="absolute left-0.5 right-0.5 rounded bg-gray-300 dark:bg-gray-600 pointer-events-none"
                  style={{ top, height: Math.max(bot - top, 8) }} />
              );
            })}

            {/* User blocks */}
            {blocks.filter((b) => b.date === date).map((b, i) => {
              const globalIdx = blocks.findIndex((x) => x === b);
              const top = getYFromMin(timeToMin(b.start_time));
              const bot = getYFromMin(timeToMin(b.end_time));
              const height = Math.max(bot - top, 14);
              const isTooltipOpen = tooltipIdx === globalIdx;

              return (
                <div key={`block-${i}`}
                  className="absolute left-0.5 right-0.5 rounded flex items-center justify-end cursor-pointer"
                  style={{ top, height, backgroundColor: blockColor }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setTooltipIdx(isTooltipOpen ? null : globalIdx);
                  }}
                >
                  {/* Tooltip */}
                  {isTooltipOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20
                      bg-gray-900/85 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
                      {b.start_time} ~ {b.end_time}
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBlock(globalIdx); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-white/60 hover:text-white text-sm leading-none pr-0.5 font-bold"
                  >
                    &times;
                  </button>
                </div>
              );
            })}

            {/* Drag preview */}
            {dragState && dragState.date === date && (() => {
              const lo = Math.min(dragState.startMin, dragState.currentMin);
              const hi = Math.max(dragState.startMin, dragState.currentMin);
              const top = getYFromMin(lo);
              const bot = getYFromMin(hi);
              if (bot - top < 2) return null;
              return (
                <div className="absolute left-0.5 right-0.5 rounded pointer-events-none flex items-center justify-center"
                  style={{ top, height: bot - top, backgroundColor: blockColor, opacity: 0.5 }}>
                  <span className="text-white text-[9px] font-medium">
                    {minToTime(lo)}~{minToTime(hi)}
                  </span>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
