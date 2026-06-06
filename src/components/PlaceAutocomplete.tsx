"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PlaceInfo } from "@/lib/types";

interface PlaceAutocompleteProps {
  value: PlaceInfo;
  onChange: (place: PlaceInfo) => void;
  placeholder?: string;
}

interface Suggestion {
  placeId: string;
  displayName: string;
  formattedAddress: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

async function fetchSuggestions(input: string): Promise<Suggestion[]> {
  if (!API_KEY || input.length < 2) return [];

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
        body: JSON.stringify({
          input,
          languageCode: "ko",
        }),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.suggestions || [])
      .filter((s: { placePrediction?: unknown }) => s.placePrediction)
      .map((s: { placePrediction: { placeId: string; text: { text: string }; structuredFormat: { secondaryText?: { text: string } } } }) => ({
        placeId: s.placePrediction.placeId,
        displayName: s.placePrediction.text.text,
        formattedAddress: s.placePrediction.structuredFormat?.secondaryText?.text || "",
      }));
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceInfo | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=ko`,
      {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "displayName,location",
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    return {
      name: data.displayName?.text || "",
      place_id: placeId,
      lat: data.location?.latitude,
      lng: data.location?.longitude,
    };
  } catch {
    return null;
  }
}

export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder = "장소를 검색하세요",
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value.name);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => {
    setQuery(value.name);
  }, [value.name]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = useCallback(
    (input: string) => {
      setQuery(input);
      onChange({ name: input });

      if (!API_KEY) return;

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (input.length < 2) {
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }
        setLoading(true);
        const results = await fetchSuggestions(input);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setLoading(false);
      }, 300);
    },
    [onChange]
  );

  const handleSelect = async (suggestion: Suggestion) => {
    setShowDropdown(false);
    setQuery(suggestion.displayName);

    const details = await fetchPlaceDetails(suggestion.placeId);
    if (details) {
      onChange(details);
      setQuery(details.name);
    } else {
      onChange({ name: suggestion.displayName, place_id: suggestion.placeId });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
            >
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.displayName}</p>
              {s.formattedAddress && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{s.formattedAddress}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
