// Google Routes API client with in-memory caching

export interface RouteStep {
  travelMode: string;
  durationSeconds: number;
  distanceMeters: number;
  transitName?: string;
  transitVehicle?: string;
  departureStop?: string;
  arrivalStop?: string;
  instructions?: string;
}

export interface RouteOption {
  durationSeconds: number;
  distanceMeters: number;
  polyline: string; // encoded polyline
  steps: RouteStep[];
  travelMode: "TRANSIT" | "WALK" | "DRIVE";
}

export interface RoutesResult {
  transit: RouteOption[];
  walk: RouteOption[];
  drive: RouteOption[];
}

interface CacheEntry {
  result: RoutesResult;
  cacheKey: string;
}

const cache = new Map<string, CacheEntry>();

export function clearRoutesCache() {
  cache.clear();
}

function makeCacheKey(
  originId: string,
  destId: string,
  departureTime: string
): string {
  return `${originId}__${destId}__${departureTime}`;
}

function mergeConsecutiveWalks(steps: RouteStep[]): RouteStep[] {
  const merged: RouteStep[] = [];
  for (const step of steps) {
    const last = merged[merged.length - 1];
    if (last && last.travelMode === "WALK" && step.travelMode === "WALK") {
      last.durationSeconds += step.durationSeconds;
      last.distanceMeters += step.distanceMeters;
    } else {
      merged.push({ ...step });
    }
  }
  return merged;
}

async function fetchRoutes(
  origin: { lat?: number; lng?: number; name: string; place_id?: string },
  destination: { lat?: number; lng?: number; name: string; place_id?: string },
  travelMode: "TRANSIT" | "WALK" | "DRIVE",
  departureTime?: string // ISO 8601
): Promise<RouteOption[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const makeWaypoint = (p: typeof origin) => {
    if (p.lat && p.lng) {
      return { location: { latLng: { latitude: p.lat, longitude: p.lng } } };
    }
    if (p.place_id) {
      return { placeId: p.place_id };
    }
    return { address: p.name };
  };

  const body: Record<string, unknown> = {
    origin: makeWaypoint(origin),
    destination: makeWaypoint(destination),
    travelMode,
    computeAlternativeRoutes: true,
    languageCode: "ko",
  };

  if (travelMode === "TRANSIT" && departureTime) {
    body.departureTime = departureTime;
  }

  const fieldMask =
    travelMode === "TRANSIT"
      ? "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.distanceMeters,routes.legs.steps.transitDetails,routes.legs.steps.navigationInstruction"
      : "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction";

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.routes?.length) return [];

    return data.routes.map((route: Record<string, unknown>): RouteOption => {
      const durationStr = (route.duration as string) || "0s";
      const durationSeconds = parseInt(durationStr.replace("s", ""), 10) || 0;

      const legs = (route.legs as Record<string, unknown>[]) || [];
      const steps: RouteStep[] = [];

      for (const leg of legs) {
        const legSteps = (leg.steps as Record<string, unknown>[]) || [];
        for (const step of legSteps) {
          const stepDur = (step.staticDuration as string) || "0s";
          const td = step.transitDetails as Record<string, unknown> | undefined;
          const tl = td?.transitLine as Record<string, unknown> | undefined;
          const sd = td?.stopDetails as Record<string, unknown> | undefined;
          const nav = step.navigationInstruction as Record<string, unknown> | undefined;

          steps.push({
            travelMode: (step.travelMode as string) || "WALK",
            durationSeconds: parseInt(stepDur.replace("s", ""), 10) || 0,
            distanceMeters: (step.distanceMeters as number) || 0,
            transitName: tl?.name as string | undefined,
            transitVehicle: (tl?.vehicle as Record<string, unknown>)?.type as string | undefined,
            departureStop: (sd?.departureStop as Record<string, unknown>)?.name as string | undefined,
            arrivalStop: (sd?.arrivalStop as Record<string, unknown>)?.name as string | undefined,
            instructions: nav?.instructions as string | undefined,
          });
        }
      }

      return {
        durationSeconds,
        distanceMeters: (route.distanceMeters as number) || 0,
        polyline: (route.polyline as Record<string, string>)?.encodedPolyline || "",
        steps: mergeConsecutiveWalks(steps),
        travelMode,
      };
    });
  } catch {
    return [];
  }
}

// Legacy Directions API fallback via server proxy
async function fetchLegacyDirections(
  origin: { lat?: number; lng?: number; name: string; place_id?: string },
  destination: { lat?: number; lng?: number; name: string; place_id?: string },
  mode: "transit" | "walking",
  departureTime?: string
): Promise<RouteOption[]> {
  const originStr = origin.lat && origin.lng
    ? `${origin.lat},${origin.lng}`
    : origin.place_id ? `place_id:${origin.place_id}` : origin.name;
  const destStr = destination.lat && destination.lng
    ? `${destination.lat},${destination.lng}`
    : destination.place_id ? `place_id:${destination.place_id}` : destination.name;

  let url = `/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&mode=${mode}`;

  if (mode === "transit" && departureTime) {
    const dt = new Date(departureTime);
    url += `&departure_time=${Math.floor(dt.getTime() / 1000)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK" || !data.routes?.length) return [];

    const travelModeLabel = mode === "transit" ? "TRANSIT" : "WALK";

    return data.routes.map((route: Record<string, unknown>): RouteOption => {
      const legs = route.legs as Record<string, unknown>[];
      const leg = legs[0];
      const dur = leg.duration as { value: number };
      const dist = leg.distance as { value: number };
      const polyline = (route.overview_polyline as Record<string, string>)?.points || "";

      const steps: RouteStep[] = ((leg.steps as Record<string, unknown>[]) || []).map((step) => {
        const stepDur = step.duration as { value: number };
        const stepDist = step.distance as { value: number };
        const td = step.transit_details as Record<string, unknown> | undefined;
        const line = td?.line as Record<string, unknown> | undefined;

        return {
          travelMode: (step.travel_mode as string) === "WALKING" ? "WALK" : (step.travel_mode as string) || "WALK",
          durationSeconds: stepDur?.value || 0,
          distanceMeters: stepDist?.value || 0,
          transitName: line?.short_name as string || line?.name as string || undefined,
          transitVehicle: (line?.vehicle as Record<string, unknown>)?.type as string || undefined,
          departureStop: (td?.departure_stop as Record<string, unknown>)?.name as string || undefined,
          arrivalStop: (td?.arrival_stop as Record<string, unknown>)?.name as string || undefined,
          instructions: step.html_instructions as string || undefined,
        };
      });

      return {
        durationSeconds: dur?.value || 0,
        distanceMeters: dist?.value || 0,
        polyline,
        steps: mergeConsecutiveWalks(steps),
        travelMode: travelModeLabel,
      };
    });
  } catch {
    return [];
  }
}

export async function getRoutes(
  origin: { lat?: number; lng?: number; name: string; place_id?: string },
  destination: { lat?: number; lng?: number; name: string; place_id?: string },
  departureTime: string // "YYYY-MM-DDTHH:MM"
): Promise<RoutesResult> {
  const originId = origin.place_id || `${origin.lat},${origin.lng}` || origin.name;
  const destId = destination.place_id || `${destination.lat},${destination.lng}` || destination.name;
  const cacheKey = makeCacheKey(originId, destId, departureTime);

  const cached = cache.get(cacheKey);
  if (cached) return cached.result;

  const isoTime = departureTime.includes("T")
    ? departureTime.length > 19
      ? departureTime
      : departureTime + ":00Z"
    : departureTime + "T00:00:00Z";

  let [transit, walk, drive] = await Promise.all([
    fetchRoutes(origin, destination, "TRANSIT", isoTime),
    fetchRoutes(origin, destination, "WALK"),
    fetchRoutes(origin, destination, "DRIVE"),
  ]);

  // Fallback to Legacy Directions API if Routes API v2 returns no results
  const legacyFallbacks: Promise<void>[] = [];
  if (!transit.length) {
    legacyFallbacks.push(
      fetchLegacyDirections(origin, destination, "transit", isoTime)
        .then((r) => { transit = r; })
    );
  }
  if (!walk.length) {
    legacyFallbacks.push(
      fetchLegacyDirections(origin, destination, "walking")
        .then((r) => { walk = r; })
    );
  }
  if (legacyFallbacks.length) await Promise.all(legacyFallbacks);

  // Sort by duration
  transit.sort((a, b) => a.durationSeconds - b.durationSeconds);
  walk.sort((a, b) => a.durationSeconds - b.durationSeconds);
  drive.sort((a, b) => a.durationSeconds - b.durationSeconds);

  const result: RoutesResult = { transit, walk, drive };
  cache.set(cacheKey, { result, cacheKey });
  return result;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}
