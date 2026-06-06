"use client";

import { useState } from "react";
import { PlaceDetails, PlaceInfo, TimeBlock, WishlistCategory } from "@/lib/types";
import PlaceAutocomplete from "./PlaceAutocomplete";
import DragTimeTable from "./DragTimeTable";

interface PlaceFormProps {
  category: WishlistCategory;
  initial?: PlaceDetails;
  participants: string[];
  initialAddedBy?: string;
  tripDates: string[];
  onSubmit: (data: PlaceDetails, addedBy: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const emptyPlace: PlaceInfo = { name: "" };

export default function PlaceForm({
  category,
  initial,
  participants,
  initialAddedBy,
  tripDates,
  onSubmit,
  onCancel,
  submitLabel = "추가하기",
}: PlaceFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [place, setPlace] = useState<PlaceInfo>(initial?.place || { ...emptyPlace });
  const [businessHours, setBusinessHours] = useState<TimeBlock[]>(initial?.business_hours || []);
  const [showHoursEditor, setShowHoursEditor] = useState(false);
  const [cost, setCost] = useState<string>(
    initial?.cost !== undefined ? String(initial.cost) : ""
  );
  const [notes, setNotes] = useState(initial?.notes || "");
  const [addedBy, setAddedBy] = useState(initialAddedBy || participants[0] || "");

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const placeValid = hasApiKey ? !!place.place_id : !!place.name;
  const canSubmit = name.trim() && placeValid && place.name.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const details: PlaceDetails = {
      name: name.trim(),
      place,
      business_hours: businessHours,
      confirmed_slots: initial?.confirmed_slots || [],
      cost: cost ? parseInt(cost, 10) : 0,
      notes: notes.slice(0, 1000),
    };
    onSubmit(details, addedBy);
  };

  const labels: Record<string, string> = {
    "식사": "맛집", "카페&디저트": "카페", "관광지": "장소", "숙박": "숙소",
  };
  const categoryLabel = labels[category] || "장소";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">일정 이름</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="예: 점심 스시, 야경 구경"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          위치
          {hasApiKey && place.name && !place.place_id && (
            <span className="ml-1 text-red-400 dark:text-red-300 font-normal">검색 결과에서 선택해주세요</span>
          )}
        </label>
        <PlaceAutocomplete value={place} onChange={setPlace} placeholder={`${categoryLabel}를 검색하세요`} />
      </div>

      {/* Business hours */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            영업 시간 <span className="text-gray-400 dark:text-gray-500 font-normal">({businessHours.length}개 블록)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowHoursEditor(true)}
            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 font-medium"
          >
            {businessHours.length > 0 ? "수정" : "설정"}
          </button>
        </div>
        {businessHours.length > 0 && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5">
            {businessHours.map((bh, i) => (
              <div key={i}>{bh.date} {bh.start_time}~{bh.end_time}</div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">총 비용 (원)</label>
        <input type="number" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="예: 15000" min={0}
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
          placeholder="메뉴 추천, 예약 정보 등" rows={2}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

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

      {/* Business Hours Editor Modal */}
      {showHoursEditor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">영업 시간 설정</h3>
              <button onClick={() => setShowHoursEditor(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
            </div>
            <p className="px-4 pt-2 text-[11px] text-gray-400 dark:text-gray-500">드래그해서 영업 시간을 표시하세요. 여러 블록을 추가할 수 있습니다.</p>
            <div className="flex-1 overflow-hidden p-4">
              <DragTimeTable
                dates={tripDates}
                blocks={businessHours}
                onBlocksChange={setBusinessHours}
                blockColor="#10B981"
                slotHeight={4}
              />
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setShowHoursEditor(false)}
                className="w-full py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all">
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
