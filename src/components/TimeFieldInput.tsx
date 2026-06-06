"use client";

import { useState, useRef, useEffect } from "react";

export function isValidTime(h: string, m: string): boolean {
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  return h.length === 2 && m.length === 2 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function isValidTimeStr(t: string): boolean {
  const parts = t.split(":");
  if (parts.length !== 2) return false;
  return isValidTime(parts[0], parts[1]);
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TimeFieldInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hh, mm] = value.split(":");
  const hour = hh || "00";
  const minute = mm || "00";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minListRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll to current values when opening
  useEffect(() => {
    if (!open) return;
    const hIdx = HOURS.indexOf(hour);
    const mIdx = MINUTES.findIndex((m) => parseInt(m, 10) >= parseInt(minute, 10));
    if (hourListRef.current && hIdx >= 0) {
      hourListRef.current.scrollTop = hIdx * 32 - 32;
    }
    if (minListRef.current && mIdx >= 0) {
      minListRef.current.scrollTop = mIdx * 32 - 32;
    }
  }, [open, hour, minute]);

  const selectHour = (h: string) => {
    onChange(`${h}:${minute}`);
  };

  const selectMinute = (m: string) => {
    onChange(`${hour}:${m}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0 border border-gray-300 dark:border-gray-600 rounded-lg
          overflow-hidden w-[72px] cursor-pointer hover:border-blue-400
          focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <div className="w-7 text-center text-sm py-1.5 select-none">{hour}</div>
        <span className="text-sm text-gray-400 dark:text-gray-500 font-bold select-none">:</span>
        <div className="w-7 text-center text-sm py-1.5 select-none">{minute}</div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex"
          style={{ width: 72 }}>
          {/* Hours */}
          <div ref={hourListRef}
            className="flex-1 overflow-y-auto overflow-x-hidden border-r border-gray-100 dark:border-gray-700
              scrollbar-hide"
            style={{ maxHeight: 150 }}>
            {HOURS.map((h) => (
              <button key={h} type="button"
                onClick={() => selectHour(h)}
                className={`w-full text-center text-xs py-1 transition-colors ${
                  h === hour
                    ? "bg-blue-500 text-white font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}>
                {h}
              </button>
            ))}
          </div>
          {/* Minutes */}
          <div ref={minListRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{ maxHeight: 150 }}>
            {MINUTES.map((m) => (
              <button key={m} type="button"
                onClick={() => selectMinute(m)}
                className={`w-full text-center text-xs py-1 transition-colors ${
                  m === minute
                    ? "bg-blue-500 text-white font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
