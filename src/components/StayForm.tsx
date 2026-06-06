"use client";

import { useState } from "react";
import { StayDetails, PlaceInfo } from "@/lib/types";
import PlaceAutocomplete from "./PlaceAutocomplete";
import TimeFieldInput, { isValidTimeStr } from "./TimeFieldInput";

interface StayFormProps {
  initial?: StayDetails;
  participants: string[];
  initialAddedBy?: string;
  tripStart: string;
  tripEnd: string;
  onSubmit: (data: StayDetails, addedBy: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const emptyPlace: PlaceInfo = { name: "" };

export default function StayForm({
  initial,
  participants,
  initialAddedBy,
  tripStart,
  tripEnd,
  onSubmit,
  onCancel,
  submitLabel = "추가하기",
}: StayFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [place, setPlace] = useState<PlaceInfo>(initial?.place || { ...emptyPlace });
  const [checkIn, setCheckIn] = useState(initial?.check_in_time || "15:00");
  const [checkOut, setCheckOut] = useState(initial?.check_out_time || "11:00");
  const [stayStart, setStayStart] = useState(initial?.stay_start || "");
  const [stayEnd, setStayEnd] = useState(initial?.stay_end || "");
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [cost, setCost] = useState<string>(
    initial?.cost !== undefined ? String(initial.cost) : ""
  );
  const [notes, setNotes] = useState(initial?.notes || "");
  const [addedBy, setAddedBy] = useState(initialAddedBy || participants[0] || "");
  const [error, setError] = useState("");

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const placeValid = hasApiKey ? !!place.place_id : !!place.name;
  const timesValid = isValidTimeStr(checkIn) && isValidTimeStr(checkOut);
  const canSubmit = name.trim() && placeValid && place.name.trim() && stayStart && stayEnd && timesValid;

  // Generate trip dates for calendar
  const tripDates: string[] = [];
  {
    const cur = new Date(tripStart + "T00:00:00");
    const last = new Date(tripEnd + "T00:00:00");
    while (cur <= last) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      tripDates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const handleDateClick = (date: string) => {
    if (selecting === "start") {
      setStayStart(date);
      setStayEnd("");
      setSelecting("end");
    } else {
      if (date < stayStart) {
        setStayStart(date);
        setStayEnd("");
        setSelecting("end");
      } else {
        setStayEnd(date);
        setSelecting("start");
      }
    }
  };

  const isInRange = (date: string) => stayStart && stayEnd && date >= stayStart && date <= stayEnd;
  const isStart = (date: string) => date === stayStart;
  const isEnd = (date: string) => date === stayEnd;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError("");

    if (stayStart < tripStart || stayEnd > tripEnd) {
      setError("숙박 기간은 여행 기간 내여야 합니다.");
      return;
    }

    const details: StayDetails = {
      name: name.trim(),
      place,
      check_in_time: checkIn,
      check_out_time: checkOut,
      stay_start: stayStart,
      stay_end: stayEnd,
      confirmed_slots: initial?.confirmed_slots || [],
      cost: cost ? parseInt(cost, 10) : 0,
      notes: notes.slice(0, 1000),
    };
    onSubmit(details, addedBy);
  };

  // Group dates by week rows for calendar display
  const firstDate = new Date(tripDates[0] + "T00:00:00");
  const startDayOfWeek = firstDate.getDay();
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">일정 이름</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="예: 1~3일차 숙소"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          위치
          {hasApiKey && place.name && !place.place_id && (
            <span className="ml-1 text-red-400 dark:text-red-300 font-normal">검색 결과에서 선택해주세요</span>
          )}
        </label>
        <PlaceAutocomplete value={place} onChange={setPlace} placeholder="숙소를 검색하세요" />
      </div>

      {/* Check-in / Check-out times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">체크인</label>
          <TimeFieldInput value={checkIn} onChange={setCheckIn} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">체크아웃</label>
          <TimeFieldInput value={checkOut} onChange={setCheckOut} />
        </div>
      </div>

      {/* Stay dates calendar */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
          숙박 일자
          {selecting === "end" && stayStart && !stayEnd && (
            <span className="ml-1 text-blue-500 dark:text-blue-400 font-normal">마지막 날을 선택하세요</span>
          )}
        </label>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} className={`text-center text-[10px] font-medium py-0.5 ${
                i === 0 ? "text-red-400 dark:text-red-300" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
              }`}>{wd}</div>
            ))}
          </div>
          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {tripDates.map((date) => {
              const d = new Date(date + "T00:00:00");
              const dayNum = d.getDate();
              const inRange = isInRange(date);
              const start = isStart(date);
              const end = isEnd(date);

              return (
                <button key={date} onClick={() => handleDateClick(date)}
                  className={`h-8 text-xs rounded transition-all ${
                    start || end ? "bg-blue-500 text-white font-bold" :
                    inRange ? "bg-blue-100 text-blue-700" :
                    "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}>
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
        {stayStart && stayEnd && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{stayStart} ~ {stayEnd}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">총 비용 (원)</label>
        <input type="number" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="예: 200000" min={0}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">추가자</label>
        <select value={addedBy} onChange={(e) => setAddedBy(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          {participants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          관련 정보 <span className="text-gray-400 dark:text-gray-500">({notes.length}/1000)</span>
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
          placeholder="예약 번호, 주소, 와이파이 등" rows={2}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={!canSubmit}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            canSubmit ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}>
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          취소
        </button>
      </div>
    </div>
  );
}
