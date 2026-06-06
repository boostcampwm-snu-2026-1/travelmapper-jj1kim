"use client";

import { useState } from "react";
import { TransportDetails, PlaceInfo } from "@/lib/types";
import PlaceAutocomplete from "./PlaceAutocomplete";
import TimeFieldInput, { isValidTime } from "./TimeFieldInput";

interface TransportFormProps {
  initial?: TransportDetails;
  participants: string[];
  initialAddedBy?: string;
  tripStart: string;
  tripEnd: string;
  onSubmit: (data: TransportDetails, addedBy: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const emptyPlace: PlaceInfo = { name: "" };

export default function TransportForm({
  initial,
  participants,
  initialAddedBy,
  tripStart,
  tripEnd,
  onSubmit,
  onCancel,
  submitLabel = "추가하기",
}: TransportFormProps) {
  const [transportName, setTransportName] = useState(initial?.transport_name || "");
  const [departurePlace, setDeparturePlace] = useState<PlaceInfo>(
    initial?.departure_place || { ...emptyPlace }
  );
  const [depDate, setDepDate] = useState(initial?.departure_time?.split("T")[0] || "");
  const [depTime, setDepTime] = useState(initial?.departure_time?.split("T")[1] || "09:00");
  const [arrivalPlace, setArrivalPlace] = useState<PlaceInfo>(
    initial?.arrival_place || { ...emptyPlace }
  );
  const [arrDate, setArrDate] = useState(initial?.arrival_time?.split("T")[0] || "");
  const [arrTime, setArrTime] = useState(initial?.arrival_time?.split("T")[1] || "12:00");
  const [cost, setCost] = useState<string>(
    initial?.cost !== undefined ? String(initial.cost) : ""
  );
  const [notes, setNotes] = useState(initial?.notes || "");
  const [addedBy, setAddedBy] = useState(initialAddedBy || participants[0] || "");
  const [error, setError] = useState("");

  const depTimeParts = depTime.split(":");
  const arrTimeParts = arrTime.split(":");
  const depTimeValid = isValidTime(depTimeParts[0], depTimeParts[1]);
  const arrTimeValid = isValidTime(arrTimeParts[0], arrTimeParts[1]);
  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const depPlaceValid = hasApiKey ? !!departurePlace.place_id : !!departurePlace.name;
  const arrPlaceValid = hasApiKey ? !!arrivalPlace.place_id : !!arrivalPlace.name;
  const canSubmit = transportName.trim() && depPlaceValid && arrPlaceValid && depDate && arrDate && depTimeValid && arrTimeValid;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError("");

    // Validate times within trip range
    if (depDate < tripStart || depDate > tripEnd) {
      setError(`출발일은 여행 기간(${tripStart} ~ ${tripEnd}) 내여야 합니다.`);
      return;
    }
    if (arrDate < tripStart || arrDate > tripEnd) {
      setError(`도착일은 여행 기간(${tripStart} ~ ${tripEnd}) 내여야 합니다.`);
      return;
    }

    const details: TransportDetails = {
      transport_name: transportName.trim(),
      departure_place: departurePlace,
      departure_time: `${depDate}T${depTime}`,
      arrival_place: arrivalPlace,
      arrival_time: `${arrDate}T${arrTime}`,
      cost: cost ? parseInt(cost, 10) : 0,
      notes: notes.slice(0, 1000),
    };
    onSubmit(details, addedBy);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">교통 수단 이름</label>
        <input
          type="text"
          value={transportName}
          onChange={(e) => setTransportName(e.target.value)}
          placeholder="예: KTX 123, 대한항공 KE001"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          출발지
          {hasApiKey && departurePlace.name && !departurePlace.place_id && (
            <span className="ml-1 text-red-400 dark:text-red-300 font-normal">검색 결과에서 선택해주세요</span>
          )}
        </label>
        <PlaceAutocomplete value={departurePlace} onChange={setDeparturePlace} placeholder="출발지를 검색하세요" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">출발 날짜 · 시간</label>
        <div className="flex items-center gap-2">
          <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)}
            min={tripStart} max={tripEnd}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <TimeFieldInput value={depTime} onChange={setDepTime} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          도착지
          {hasApiKey && arrivalPlace.name && !arrivalPlace.place_id && (
            <span className="ml-1 text-red-400 dark:text-red-300 font-normal">검색 결과에서 선택해주세요</span>
          )}
        </label>
        <PlaceAutocomplete value={arrivalPlace} onChange={setArrivalPlace} placeholder="도착지를 검색하세요" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">도착 날짜 · 시간</label>
        <div className="flex items-center gap-2">
          <input type="date" value={arrDate} onChange={(e) => setArrDate(e.target.value)}
            min={tripStart} max={tripEnd}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <TimeFieldInput value={arrTime} onChange={setArrTime} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">총 비용 (원)</label>
        <input type="number" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="예: 50000" min={0}
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
          placeholder="예약 번호, 좌석 정보, 참고 사항 등" rows={3}
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
