"use client";

import { useState } from "react";

interface CalendarPickerProps {
  onDatesSelected: (start: string, end: string) => void;
  initialStart?: string;
  initialEnd?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export default function CalendarPicker({
  onDatesSelected,
  initialStart,
  initialEnd,
}: CalendarPickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<string | null>(
    initialStart || null
  );
  const [endDate, setEndDate] = useState<string | null>(initialEnd || null);
  const [selecting, setSelecting] = useState<"start" | "end">("start");

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const clicked = formatDate(new Date(currentYear, currentMonth, day));

    if (selecting === "start") {
      setStartDate(clicked);
      setEndDate(null);
      setSelecting("end");
    } else {
      if (startDate && clicked < startDate) {
        setStartDate(clicked);
        setEndDate(null);
        setSelecting("end");
      } else {
        setEndDate(clicked);
        setSelecting("start");
      }
    }
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const current = formatDate(new Date(currentYear, currentMonth, day));
    return current >= startDate && current <= endDate;
  };

  const isStart = (day: number) => {
    return (
      startDate === formatDate(new Date(currentYear, currentMonth, day))
    );
  };

  const isEnd = (day: number) => {
    return endDate === formatDate(new Date(currentYear, currentMonth, day));
  };

  const canConfirm = startDate && endDate;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {currentYear}년 {MONTHS[currentMonth]}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? "text-red-400 dark:text-red-300" : i === 6 ? "text-blue-400 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayOfWeek = (firstDay + i) % 7;
          const inRange = isInRange(day);
          const start = isStart(day);
          const end = isEnd(day);

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                relative h-9 text-sm rounded-lg transition-all
                ${start || end ? "bg-blue-500 text-white font-semibold" : ""}
                ${inRange && !start && !end ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : ""}
                ${!inRange && !start && !end ? "hover:bg-gray-100 dark:hover:bg-gray-700" : ""}
                ${dayOfWeek === 0 && !start && !end && !inRange ? "text-red-400 dark:text-red-300" : ""}
                ${dayOfWeek === 6 && !start && !end && !inRange ? "text-blue-400 dark:text-blue-300" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected dates display */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center space-y-1">
        {startDate && (
          <p>
            시작: <span className="font-medium text-gray-800 dark:text-gray-200">{startDate}</span>
          </p>
        )}
        {endDate && (
          <p>
            종료: <span className="font-medium text-gray-800 dark:text-gray-200">{endDate}</span>
          </p>
        )}
        {selecting === "end" && startDate && !endDate && (
          <p className="text-blue-500 dark:text-blue-400">종료일을 선택해주세요</p>
        )}
      </div>

      {/* Confirm button */}
      <button
        onClick={() => canConfirm && onDatesSelected(startDate!, endDate!)}
        disabled={!canConfirm}
        className={`
          mt-4 w-full py-2.5 rounded-lg font-medium transition-all
          ${
            canConfirm
              ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }
        `}
      >
        일정 확정하기
      </button>
    </div>
  );
}
