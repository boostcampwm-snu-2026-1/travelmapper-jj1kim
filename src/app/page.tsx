"use client";

import { useState, useEffect, useCallback } from "react";
import CalendarPicker from "@/components/CalendarPicker";
import { useGuardState } from "@/lib/guard";
import Timeline from "@/components/Timeline";
import type { SelectedTimeRange, SelectedEventInfo } from "@/components/Timeline";
import WishlistPanel from "@/components/WishlistPanel";
import WhatToDoPanel from "@/components/WhatToDoPanel";
import ThemeToggle from "@/components/ThemeToggle";
import MapViewModal from "@/components/MapViewModal";

type View = "landing" | "calendar" | "timeline";
type Mode = "create" | "login";

interface ScheduleData {
  id: string;
  name: string;
  participants: string[];
  created_at: string;
  expires_at: string;
  trip_start: string | null;
  trip_end: string | null;
}

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [mode, setMode] = useState<Mode>("create");
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [timelineDetailItemId, setTimelineDetailItemId] = useState<string | null>(null);
  const [whatToDoMode, setWhatToDoMode] = useState(false);
  const [whatToDoRange, setWhatToDoRange] = useState<SelectedTimeRange | null>(null);
  const [feasibilityMode, setFeasibilityMode] = useState(false);
  const [mapViewOpen, setMapViewOpen] = useState(false);
  const [mapViewDetailItem, setMapViewDetailItem] = useState<null | { id: string }>(null);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [participantsEditList, setParticipantsEditList] = useState<string[]>([]);
  const [participantsEditInput, setParticipantsEditInput] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [pageGuard, pageBusy] = useGuardState();
  const [shareMessage, setShareMessage] = useState("");

  // Handle share link on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("s");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/schedules/share?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok) {
          setSchedule(data);
          if (data.trip_start && data.trip_end) {
            setView("timeline");
          } else {
            setView("calendar");
          }
          // Clean URL without reload
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch { /* silently fail, show landing */ }
    })();
  }, []);

  const handleShareLink = useCallback(async () => {
    if (!schedule) return;
    try {
      const res = await fetch("/api/schedules/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: schedule.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const url = `${window.location.origin}?s=${data.token}`;
        await navigator.clipboard.writeText(url);
        setShareMessage("링크가 복사되었습니다!");
        setTimeout(() => setShareMessage(""), 2000);
      }
    } catch { /* silently fail */ }
  }, [schedule]);

  const handleCreate = () => pageGuard(async () => {
    setError("");

    if (!name || !password || !participantsList.length) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    // Validate schedule name: no emoji, only letters/numbers/spaces/common symbols
    const nameRegex = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s\-_.,!?@#&()'+:;/\\]+$/;
    if (!nameRegex.test(name)) {
      setError("스케줄 이름에 이모지나 특수 문자를 사용할 수 없습니다.");
      return;
    }

    // Validate password: 4-20 chars, lowercase + numbers only
    const pwRegex = /^[a-z0-9]{4,20}$/;
    if (!pwRegex.test(password)) {
      setError("비밀번호는 4~20자의 영문 소문자와 숫자 조합이어야 합니다.");
      return;
    }

    const days = parseInt(expiresInDays, 10);
    if (!days || days < 1 || days > 90) {
      setError("만료 기한은 1일 이상 90일 이하로 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, participants: participantsList, expiresInDays: days }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSchedule(data);
      setView("calendar");
    } catch {
      setError("서버와 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  });

  const handleLogin = () => pageGuard(async () => {
    setError("");
    if (!name || !password) {
      setError("스케줄 이름과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedules/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSchedule(data);
      if (data.trip_start && data.trip_end) {
        setView("timeline");
      } else {
        setView("calendar");
      }
    } catch {
      setError("서버와 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  });

  const handleDatesSelected = (start: string, end: string) => pageGuard(async () => {
    if (!schedule) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/trip-dates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripStart: start, tripEnd: end }),
      });

      const data = await res.json();
      if (res.ok) {
        setSchedule(data);
        setView("timeline");
      } else {
        setError(data.error);
      }
    } catch {
      setError("서버와 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  });

  // Global loading overlay
  const loadingOverlay = pageBusy && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-300">처리 중...</span>
      </div>
    </div>
  );

  // Landing page: create or login
  if (view === "landing") {
    return (
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-950">
        <div className="w-full max-w-md">
          {/* Theme toggle */}
          <div className="flex justify-end mb-2">
            <ThemeToggle />
          </div>

          {/* Logo / Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              TravelMapper
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              유동적이면서도 계획적인 여행을 위한 스케줄러
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-6">
            <button
              onClick={() => {
                setMode("create");
                setError("");
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "create"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
              }`}
            >
              새 스케줄 만들기
            </button>
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
              }`}
            >
              기존 스케줄 접속
            </button>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                스케줄 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 부산 여행 2026"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="영문 소문자 + 숫자, 4~20자"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400"
              />
            </div>

            {mode === "create" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    참여자
                  </label>
                  {participantsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {participantsList.map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                          bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
                          {p}
                          <button onClick={() => setParticipantsList((prev) => prev.filter((_, j) => j !== i))}
                            className="text-blue-400 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-100 leading-none">
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      placeholder="이름 입력"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                        placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const trimmed = newParticipantName.trim();
                          if (trimmed && !participantsList.includes(trimmed)) {
                            setParticipantsList((prev) => [...prev, trimmed]);
                            setNewParticipantName("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newParticipantName.trim();
                        if (trimmed && !participantsList.includes(trimmed)) {
                          setParticipantsList((prev) => [...prev, trimmed]);
                          setNewParticipantName("");
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    만료 기한 (일)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    1~90일 (기본값: 90일)
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={mode === "create" ? handleCreate : handleLogin}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-medium text-white transition-all ${
                loading
                  ? "bg-blue-400 cursor-wait"
                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              {loading
                ? "처리 중..."
                : mode === "create"
                ? "스케줄 생성하기"
                : "접속하기"}
            </button>
          </div>
        </div>
        {loadingOverlay}
      </main>
    );
  }

  // Calendar view: select trip dates
  if (view === "calendar") {
    return (
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-950">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                여행 일정이 어떻게 되시나요?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                여행의 시작일과 종료일을 선택해주세요
              </p>
            </div>

            <CalendarPicker
              onDatesSelected={handleDatesSelected}
              initialStart={schedule?.trip_start || undefined}
              initialEnd={schedule?.trip_end || undefined}
            />

            {/* Cancel button — only when changing existing dates */}
            {schedule?.trip_start && schedule?.trip_end && (
              <button
                onClick={() => setView("timeline")}
                className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
            )}

            {error && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
        {loadingOverlay}
      </main>
    );
  }

  // Timeline view: main schedule
  if (view === "timeline" && schedule?.trip_start && schedule?.trip_end) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiresAt = new Date(schedule.expires_at);
    const remainingDays = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const canExtend = remainingDays <= 30;
    const createdDate = new Date(schedule.created_at).toLocaleDateString("ko-KR");
    const expiresDate = expiresAt.toLocaleDateString("ko-KR");

    // Trip D-day calculation
    const tripStartDate = new Date(schedule.trip_start + "T00:00:00");
    const tripEndDate = new Date(schedule.trip_end + "T00:00:00");
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilStart = Math.ceil((tripStartDate.getTime() - today.getTime()) / msPerDay);
    const daysSinceEnd = Math.floor((today.getTime() - tripEndDate.getTime()) / msPerDay);
    const tripDayNumber = Math.floor((today.getTime() - tripStartDate.getTime()) / msPerDay) + 1;

    let tripBadgeText: string;
    let tripBadgeColor: string;
    let tripMessage: string;

    if (daysUntilStart > 0) {
      // Before trip
      tripBadgeText = `D-${daysUntilStart}`;
      tripBadgeColor = daysUntilStart <= 7
        ? "bg-blue-500 text-white"
        : "bg-blue-100 text-blue-700";
      tripMessage = daysUntilStart === 1
        ? "내일 출발이에요!"
        : `출발까지 ${daysUntilStart}일 남았어요`;
    } else if (daysUntilStart === 0) {
      // Departure day
      tripBadgeText = "D-Day";
      tripBadgeColor = "bg-green-500 text-white";
      tripMessage = "오늘 출발하는 날이에요! 즐거운 여행 되세요";
    } else if (daysSinceEnd <= 0) {
      // During trip
      tripBadgeText = `${tripDayNumber}일차`;
      tripBadgeColor = "bg-green-500 text-white";
      tripMessage = `여행 ${tripDayNumber}일차, 즐기고 계신가요?`;
    } else {
      // After trip
      tripBadgeText = `여행 종료`;
      tripBadgeColor = "bg-gray-400 text-white";
      tripMessage = daysSinceEnd === 1
        ? "어제 여행이 끝났어요. 수고하셨어요!"
        : `여행이 끝난 지 ${daysSinceEnd}일 지났어요`;
    }

    const handleExtend = async (days: number) => {
      try {
        const res = await fetch(`/api/schedules/${schedule.id}/extend`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days }),
        });
        const data = await res.json();
        if (res.ok) {
          setSchedule(data);
        } else {
          setError(data.error);
        }
      } catch {
        setError("서버와 연결할 수 없습니다.");
      }
    };

    const handleSaveParticipants = async () => {
      if (!participantsEditList.length) {
        setError("참여자를 최소 1명 이상 입력해주세요.");
        return;
      }
      const newParticipants = participantsEditList;

      try {
        const res = await fetch(`/api/schedules/${schedule.id}/participants`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants: newParticipants }),
        });
        const data = await res.json();
        if (res.ok) {
          setSchedule(data);
          setEditingParticipants(false);
          setError("");
        } else {
          setError(data.error);
        }
      } catch {
        setError("서버와 연결할 수 없습니다.");
      }
    };

    return (
      <main className="flex-1 flex flex-col p-4 bg-gray-50 dark:bg-gray-900 max-w-4xl mx-auto w-full">
        {/* Schedule info header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h1 className="font-bold text-gray-800 dark:text-gray-200">{schedule.name}</h1>
              <button onClick={handleShareLink} title="공유 링크 복사"
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {shareMessage && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
                  {shareMessage}
                </span>
              )}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tripBadgeColor}`}>
                {tripBadgeText}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSchedule(null);
                  setView("landing");
                  setName("");
                  setPassword("");
                  setError("");
                  setWishlistOpen(false);
                }}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                나가기
              </button>
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-1">
            {editingParticipants ? (
              <div className="mt-1 space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {participantsEditList.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full
                      bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-medium">
                      {p}
                      <button onClick={() => setParticipantsEditList((prev) => prev.filter((_, j) => j !== i))}
                        className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-100 leading-none">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={participantsEditInput}
                    onChange={(e) => setParticipantsEditInput(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="이름 입력"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = participantsEditInput.trim();
                        if (trimmed && !participantsEditList.includes(trimmed)) {
                          setParticipantsEditList((prev) => [...prev, trimmed]);
                          setParticipantsEditInput("");
                        }
                      }
                      if (e.key === "Escape") setEditingParticipants(false);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const trimmed = participantsEditInput.trim();
                      if (trimmed && !participantsEditList.includes(trimmed)) {
                        setParticipantsEditList((prev) => [...prev, trimmed]);
                        setParticipantsEditInput("");
                      }
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium"
                  >+</button>
                  <button
                    onClick={handleSaveParticipants}
                    className="text-xs px-2 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 font-medium"
                  >저장</button>
                  <button
                    onClick={() => setEditingParticipants(false)}
                    className="text-xs px-2 py-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >취소</button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {schedule.participants.join(", ")}
                <button
                  onClick={() => {
                    setParticipantsEditList([...schedule.participants]);
                    setParticipantsEditInput("");
                    setEditingParticipants(true);
                  }}
                  className="ml-1.5 text-blue-400 hover:text-blue-500"
                >
                  수정
                </button>
                <span className="mx-1 text-gray-300">·</span>
                {tripMessage}
              </p>
            )}
          </div>

          {/* Expiration info */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              생성: {createdDate}
            </span>
            <span className={`text-xs font-medium ${
              remainingDays <= 7
                ? "text-red-500"
                : remainingDays <= 30
                ? "text-amber-500"
                : "text-gray-500 dark:text-gray-400"
            }`}>
              만료: {expiresDate} (D-{remainingDays})
            </span>

            {canExtend && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-amber-500">연장:</span>
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleExtend(d)}
                    className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600
                      hover:bg-blue-100 transition-colors font-medium"
                  >
                    +{d}일
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Overlay when what-to-do or feasibility mode is active */}
        {whatToDoMode && !whatToDoRange && (
          <div className="fixed inset-0 bg-black/30 z-30 pointer-events-none" />
        )}
        {feasibilityMode && (
          <div className="fixed inset-0 bg-black/30 z-30 cursor-pointer"
            onClick={() => setFeasibilityMode(false)} />
        )}

        <div className={`flex-1 min-h-0 ${whatToDoMode || feasibilityMode ? "relative z-40" : ""}`}>
          <Timeline
            scheduleId={schedule.id}
            tripStart={schedule.trip_start}
            tripEnd={schedule.trip_end}
            participants={schedule.participants}
            onChangeDates={() => setView("calendar")}
            onOpenWishlist={() => setWishlistOpen(true)}
            onWhatToDo={() => setWhatToDoMode((v) => !v)}
            onFeasibility={() => setFeasibilityMode((v) => !v)}
            onFeasibilityCancel={() => setFeasibilityMode(false)}
            onMapView={() => setMapViewOpen(true)}
            onWishlistItemClick={(itemId) => {
              setTimelineDetailItemId(itemId);
              setWishlistOpen(true);
            }}
            refreshKey={timelineRefreshKey}
            whatToDoMode={whatToDoMode && !whatToDoRange}
            onWhatToDoSelect={(range) => {
              setWhatToDoRange(range);
            }}
            feasibilityMode={feasibilityMode}
            onFeasibilitySelect={(start, end) => {
              setFeasibilityMode(false);
              pageGuard(async () => { try {
                const res = await fetch(`/api/schedules/${schedule.id}/wishlist`);
                if (!res.ok) return;
                const items = await res.json();

                const getLoc = (itemId: string, isStart: boolean) => {
                  const item = items.find((i: { id: string }) => i.id === itemId);
                  if (!item?.details) return null;
                  const d = typeof item.details === "string" ? JSON.parse(item.details) : item.details;
                  if (item.category === "교통") return isStart ? d.arrival_place : d.departure_place;
                  return d.place;
                };

                const origin = getLoc(start.itemId, true);
                const dest = getLoc(end.itemId, false);
                if (!origin || !dest) return;

                const originStr = origin.lat && origin.lng
                  ? `${origin.lat},${origin.lng}` : origin.name;
                const destStr = dest.lat && dest.lng
                  ? `${dest.lat},${dest.lng}` : dest.name;

                // !7e2 = local time epoch (seconds from 1970-01-01 00:00 LOCAL, not UTC)
                const [y, mo, d] = start.date.split("-").map(Number);
                const [h, m] = start.endTime.split(":").map(Number);
                const localEpoch = Math.floor(Date.UTC(y, mo - 1, d, h, m, 0) / 1000);

                const url = `https://www.google.com/maps/dir/${encodeURIComponent(originStr)}/${encodeURIComponent(destStr)}/data=!4m5!4m4!2m3!6e0!7e2!8j${localEpoch}!3e3`;
                window.open(url, "_blank");
              } catch { /* silently fail */ } });
            }}
          />
        </div>

        {/* Overlay stays during panel open — z-50 to cover timeline (z-40) */}
        {whatToDoRange && (
          <div className="fixed inset-0 bg-black/30 z-[45]" />
        )}

        <WishlistPanel
          scheduleId={schedule.id}
          participants={schedule.participants}
          tripStart={schedule.trip_start}
          tripEnd={schedule.trip_end}
          isOpen={wishlistOpen}
          onClose={() => { setWishlistOpen(false); setTimelineDetailItemId(null); }}
          onConfirmChange={() => setTimelineRefreshKey((k) => k + 1)}
          openItemId={timelineDetailItemId}
          onItemOpened={() => setTimelineDetailItemId(null)}
        />

        {mapViewOpen && (
          <MapViewModal
            scheduleId={schedule.id}
            participants={schedule.participants}
            tripStart={schedule.trip_start}
            tripEnd={schedule.trip_end}
            tripDates={(() => {
              const d: string[] = [];
              const cur = new Date(schedule.trip_start + "T00:00:00");
              const last = new Date(schedule.trip_end + "T00:00:00");
              while (cur <= last) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, "0");
                const dd = String(cur.getDate()).padStart(2, "0");
                d.push(`${y}-${m}-${dd}`);
                cur.setDate(cur.getDate() + 1);
              }
              return d;
            })()}
            onClose={() => { setMapViewOpen(false); setMapViewDetailItem(null); }}
            onItemClick={(item) => {
              setMapViewDetailItem(item);
              setTimelineDetailItemId(item.id);
              setWishlistOpen(true);
            }}
          />
        )}

        {whatToDoRange && (
          <WhatToDoPanel
            scheduleId={schedule.id}
            participants={schedule.participants}
            tripDates={(() => {
              const d: string[] = [];
              const cur = new Date(schedule.trip_start + "T00:00:00");
              const last = new Date(schedule.trip_end + "T00:00:00");
              while (cur <= last) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, "0");
                const dd = String(cur.getDate()).padStart(2, "0");
                d.push(`${y}-${m}-${dd}`);
                cur.setDate(cur.getDate() + 1);
              }
              return d;
            })()}
            selectedRange={whatToDoRange}
            isOpen={true}
            onClose={() => {
              setWhatToDoRange(null);
              setWhatToDoMode(false);
              setTimelineRefreshKey((k) => k + 1);
            }}
            onConfirmChange={() => setTimelineRefreshKey((k) => k + 1)}
          />
        )}

        {loadingOverlay}
      </main>
    );
  }

  return null;
}
