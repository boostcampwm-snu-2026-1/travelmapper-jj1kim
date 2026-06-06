"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RoutesResult,
  RouteOption,
  getRoutes,
  formatDuration,
  formatDistance,
} from "@/lib/routes";

interface FeasibilityModalProps {
  startLabel: string;
  endLabel: string;
  origin: { lat?: number; lng?: number; name: string; place_id?: string };
  destination: { lat?: number; lng?: number; name: string; place_id?: string };
  departureTime: string;
  startEndTime: string;
  endStartTime: string;
  endDate: string;
  startDate: string;
  onClose: () => void;
}

const VEHICLE_ICONS: Record<string, string> = {
  BUS: "🚌", RAIL: "🚆", SUBWAY: "🚇", TRAM: "🚊", FERRY: "⛴️",
  HEAVY_RAIL: "🚆", COMMUTER_TRAIN: "🚆", HIGH_SPEED_TRAIN: "🚅",
  WALK: "🚶", TRANSIT: "🚇",
};

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function loadMapsApi(): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject("No API key");
  if (window.google?.maps?.Map) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      // Wait for it to load
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject("Timeout"); }, 5000);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject("Script load failed");
    document.head.appendChild(script);
  });
}

export default function FeasibilityModal({
  startLabel, endLabel, origin, destination, departureTime,
  startEndTime, endStartTime, endDate, startDate, onClose,
}: FeasibilityModalProps) {
  const [result, setResult] = useState<RoutesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const isFeasible = useCallback(
    (routes: RoutesResult): { feasible: boolean; fastest: number } => {
      const allRoutes = [...routes.transit, ...routes.walk, ...routes.drive];
      if (!allRoutes.length) return { feasible: false, fastest: 0 };
      const fastest = Math.min(...allRoutes.map((r) => r.durationSeconds));
      const [sh, sm] = startEndTime.split(":").map(Number);
      const [eh, em] = endStartTime.split(":").map(Number);
      const startD = new Date(startDate + "T00:00:00");
      const endD = new Date(endDate + "T00:00:00");
      const dayDiff = Math.round((endD.getTime() - startD.getTime()) / 86400000);
      const endMin = eh * 60 + em + dayDiff * 1440;
      const arrivalMin = sh * 60 + sm + Math.ceil(fastest / 60);
      return { feasible: arrivalMin <= endMin, fastest };
    },
    [startEndTime, endStartTime, startDate, endDate]
  );

  // Fetch routes
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await getRoutes(origin, destination, departureTime);
        setResult(r);
        if (!r.transit.length && !r.walk.length && !r.drive.length) {
          setError("경로를 찾을 수 없습니다. 위치 정보를 확인해주세요.");
        }
      } catch {
        setError("경로 검색에 실패했습니다.");
      }
      setLoading(false);
    })();
  }, [origin, destination, departureTime]);

  // Show route on map when selected
  useEffect(() => {
    if (!selectedRoute?.polyline) return;

    const path = decodePolyline(selectedRoute.polyline);
    if (!path.length) return;

    (async () => {
      try {
        await loadMapsApi();
      } catch {
        return;
      }

      if (!mapContainerRef.current) return;

      // Create map if not exists
      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: path[0],
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
        });
      }

      // Clear old polyline and markers
      polylineRef.current?.setMap(null);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Draw polyline
      polylineRef.current = new window.google.maps.Polyline({
        path,
        strokeColor: "#3B82F6",
        strokeWeight: 4,
        strokeOpacity: 0.8,
        map: mapRef.current,
      });

      // Add start/end markers
      markersRef.current.push(
        new window.google.maps.Marker({
          position: path[0],
          map: mapRef.current,
          label: { text: "A", color: "white", fontWeight: "bold" },
        }),
        new window.google.maps.Marker({
          position: path[path.length - 1],
          map: mapRef.current,
          label: { text: "B", color: "white", fontWeight: "bold" },
        })
      );

      // Fit bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 40);
    })();
  }, [selectedRoute]);

  const feasibility = result ? isFeasible(result) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">가능한 걸까?</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Route info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700">{startLabel}</span>
            <span className="mx-1.5">→</span>
            <span className="font-medium text-gray-700">{endLabel}</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">경로 검색 중...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Feasibility result */}
          {feasibility && !loading && (
            <div className={`rounded-xl px-4 py-3 text-center ${
              feasibility.feasible ? "bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-600" : "bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-600"
            }`}>
              <div className={`text-2xl font-bold ${feasibility.feasible ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {feasibility.feasible ? "가능해요!" : "어려워요"}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                최소 이동 시간: <span className="font-medium">{formatDuration(feasibility.fastest)}</span>
                <span className="mx-1">·</span>
                여유 시간: {(() => {
                  const [sh, sm] = startEndTime.split(":").map(Number);
                  const [eh, em] = endStartTime.split(":").map(Number);
                  const startD2 = new Date(startDate + "T00:00:00");
                  const endD2 = new Date(endDate + "T00:00:00");
                  const dayDiff = Math.round((endD2.getTime() - startD2.getTime()) / 86400000);
                  const available = (eh * 60 + em + dayDiff * 1440) - (sh * 60 + sm);
                  const margin = available - Math.ceil(feasibility.fastest / 60);
                  return margin > 0 ? `${margin}분` : "없음";
                })()}
              </p>
            </div>
          )}

          {/* Route options */}
          {result && !loading && (
            <>
              {/* Transit */}
              {result.transit.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">🚇 대중교통</div>
                  <div className="space-y-1.5">
                    {result.transit.map((route, i) => (
                      <button key={`t-${i}`} onClick={() => setSelectedRoute(route)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition-all border ${
                          selectedRoute === route ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatDuration(route.durationSeconds)}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDistance(route.distanceMeters)}</span>
                        </div>
                        <div className="flex items-center gap-0.5 overflow-x-auto">
                          {route.steps.map((step, j) => (
                            <div key={j} className="flex items-center gap-0.5 flex-shrink-0">
                              {j > 0 && <span className="text-gray-300 text-[10px]">›</span>}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                step.travelMode === "WALK" ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                              }`}>
                                {VEHICLE_ICONS[step.transitVehicle || step.travelMode] || "🚌"}
                                {step.transitName || (step.travelMode === "WALK" ? "도보" : "")}
                                {" "}{Math.ceil(step.durationSeconds / 60)}분
                              </span>
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Walk */}
              {result.walk.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">🚶 도보</div>
                  <div className="space-y-1.5">
                    {result.walk.map((route, i) => (
                      <button key={`w-${i}`} onClick={() => setSelectedRoute(route)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition-all border ${
                          selectedRoute === route ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">🚶 {formatDuration(route.durationSeconds)}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDistance(route.distanceMeters)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drive */}
              {result.drive.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">🚗 자동차</div>
                  <div className="space-y-1.5">
                    {result.drive.map((route, i) => (
                      <button key={`d-${i}`} onClick={() => setSelectedRoute(route)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition-all border ${
                          selectedRoute === route ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">🚗 {formatDuration(route.durationSeconds)}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDistance(route.distanceMeters)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transit route details (only for transit) */}
              {selectedRoute && selectedRoute.travelMode === "TRANSIT" && selectedRoute.steps.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">상세 경로</div>
                  <div className="space-y-1.5">
                    {selectedRoute.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="flex-shrink-0 mt-0.5">
                          {VEHICLE_ICONS[step.transitVehicle || step.travelMode] || "•"}
                        </span>
                        <div>
                          {step.travelMode === "WALK" ? (
                            <span className="text-gray-600 dark:text-gray-300">
                              도보 {formatDuration(step.durationSeconds)} ({formatDistance(step.distanceMeters)})
                            </span>
                          ) : (
                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{step.transitName || "대중교통"}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">{formatDuration(step.durationSeconds)}</span>
                              {step.departureStop && step.arrivalStop && (
                                <div className="text-gray-400 dark:text-gray-500 mt-0.5">{step.departureStop} → {step.arrivalStop}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {selectedRoute && (
                <div ref={mapContainerRef} className="w-full h-52 rounded-lg border border-gray-200 dark:border-gray-700" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
