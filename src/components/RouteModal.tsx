"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface RouteModalProps {
  startLabel: string;
  endLabel: string;
  origin: { lat?: number; lng?: number; name: string; place_id?: string };
  destination: { lat?: number; lng?: number; name: string; place_id?: string };
  departureTime: Date;
  onClose: () => void;
}

interface RouteResult {
  summary: string;
  duration: string;
  distance: string;
  departureTime?: string;
  arrivalTime?: string;
  steps: { mode: string; instruction: string; duration: string; transitName?: string; vehicleType?: string }[];
  dirResult: google.maps.DirectionsResult;
  routeIndex: number;
}

function loadMapsApi(): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject("No API key");
  if (window.google?.maps?.DirectionsService) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.DirectionsService) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject("Timeout"); }, 8000);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      const check2 = setInterval(() => {
        if (window.google?.maps?.DirectionsService) { clearInterval(check2); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check2); reject("Timeout"); }, 5000);
    };
    script.onerror = () => reject("Script load failed");
    document.head.appendChild(script);
  });
}

export default function RouteModal({
  startLabel, endLabel, origin, destination, departureTime, onClose,
}: RouteModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const fetchDirections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadMapsApi();

      const service = new window.google.maps.DirectionsService();

      const makeLocation = (p: typeof origin): google.maps.Place | google.maps.LatLng => {
        if (p.place_id) return { placeId: p.place_id };
        if (p.lat && p.lng) return new window.google.maps.LatLng(p.lat, p.lng);
        return { query: p.name } as unknown as google.maps.Place;
      };

      const request: google.maps.DirectionsRequest = {
        origin: makeLocation(origin),
        destination: makeLocation(destination),
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: {
          departureTime,
        },
        provideRouteAlternatives: true,
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        service.route(request, (res, status) => {
          if (status === "OK" && res) resolve(res);
          else reject(status);
        });
      });

      const parsed: RouteResult[] = result.routes.map((route, idx) => {
        const leg = route.legs[0];
        return {
          summary: route.summary || "",
          duration: leg.duration?.text || "",
          distance: leg.distance?.text || "",
          departureTime: leg.departure_time?.text,
          arrivalTime: leg.arrival_time?.text,
          steps: leg.steps.map((step) => ({
            mode: step.travel_mode,
            instruction: step.instructions || "",
            duration: step.duration?.text || "",
            transitName: step.transit?.line?.short_name || step.transit?.line?.name,
            vehicleType: step.transit?.line?.vehicle?.type,
          })),
          dirResult: result,
          routeIndex: idx,
        };
      });

      // Sort by duration
      parsed.sort((a, b) => {
        const aDur = a.dirResult.routes[a.routeIndex].legs[0].duration?.value || 0;
        const bDur = b.dirResult.routes[b.routeIndex].legs[0].duration?.value || 0;
        return aDur - bDur;
      });

      setRoutes(parsed);
      if (parsed.length > 0) setSelectedIdx(0);

    } catch (e) {
      const status = String(e);
      if (status === "ZERO_RESULTS") {
        setError("대중교통 경로를 찾을 수 없습니다.");
      } else {
        setError(`경로 검색 실패: ${status}`);
      }
    }
    setLoading(false);
  }, [origin, destination, departureTime]);

  useEffect(() => { fetchDirections(); }, [fetchDirections]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps?.Map) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: origin.lat || 35.68, lng: origin.lng || 139.76 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
    });
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: false,
    });
  });

  // Render selected route
  useEffect(() => {
    if (selectedIdx === null || !routes[selectedIdx] || !rendererRef.current) return;
    const route = routes[selectedIdx];
    rendererRef.current.setDirections(route.dirResult);
    rendererRef.current.setRouteIndex(route.routeIndex);
  }, [selectedIdx, routes]);

  const VEHICLE_ICONS: Record<string, string> = {
    BUS: "🚌", RAIL: "🚆", SUBWAY: "🚇", TRAM: "🚊", HEAVY_RAIL: "🚆",
    COMMUTER_TRAIN: "🚆", HIGH_SPEED_TRAIN: "🚅", FERRY: "⛴️",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">경로 조회</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Route info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700">{startLabel}</span>
            <span className="mx-1.5">→</span>
            <span className="font-medium text-gray-700">{endLabel}</span>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            출발: {departureTime.toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" })}
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

          {/* Route options */}
          {routes.length > 0 && (
            <div className="space-y-1.5">
              {routes.map((route, i) => (
                <button key={i} onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left rounded-lg px-3 py-2 transition-all border ${
                    selectedIdx === i ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{route.duration}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {route.departureTime && route.arrivalTime
                        ? `${route.departureTime} → ${route.arrivalTime}`
                        : route.distance}
                    </span>
                  </div>
                  {/* Steps bar */}
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {route.steps.map((step, j) => {
                      if (step.mode === "WALKING" && parseInt(step.duration) === 0) return null;
                      return (
                        <div key={j} className="flex items-center gap-0.5 flex-shrink-0">
                          {j > 0 && <span className="text-gray-300 text-[10px]">›</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            step.mode === "WALKING" ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                          }`}>
                            {step.mode === "WALKING"
                              ? `🚶 ${step.duration}`
                              : `${VEHICLE_ICONS[step.vehicleType || ""] || "🚌"} ${step.transitName || ""} ${step.duration}`
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected route details */}
          {selectedIdx !== null && routes[selectedIdx] && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">상세 경로</div>
              <div className="space-y-1.5">
                {routes[selectedIdx].steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="flex-shrink-0 mt-0.5">
                      {step.mode === "WALKING" ? "🚶" : VEHICLE_ICONS[step.vehicleType || ""] || "🚌"}
                    </span>
                    <div>
                      {step.mode === "WALKING" ? (
                        <span className="text-gray-600 dark:text-gray-300">도보 {step.duration}</span>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">
                          <span className="font-medium">{step.transitName || "대중교통"}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">{step.duration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {!loading && routes.length > 0 && (
            <div ref={mapRef} className="w-full h-52 rounded-lg border border-gray-200 dark:border-gray-700" />
          )}
        </div>
      </div>
    </div>
  );
}
