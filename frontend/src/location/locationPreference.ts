type LocationPreferenceSource = "device" | "manual-city" | "manual-coords";

type LocationPreference = {
  source: LocationPreferenceSource;
  label: string;
  lat: number;
  lon: number;
  updatedAt: string;
};

type ManualCityOption = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

const LOCATION_STORAGE_KEY = "project-lunar/location-preference";

const MANUAL_CITY_OPTIONS: ManualCityOption[] = [
  { id: "new-york", label: "New York, NY", lat: 40.7128, lon: -74.006 },
  { id: "los-angeles", label: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { id: "chicago", label: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { id: "houston", label: "Houston, TX", lat: 29.7604, lon: -95.3698 },
  { id: "miami", label: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { id: "seattle", label: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
];

function loadLocationPreference(): LocationPreference | null {
  const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocationPreference>;

    if (
      typeof parsed.label !== "string" ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lon !== "number" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    if (
      parsed.source !== "device" &&
      parsed.source !== "manual-city" &&
      parsed.source !== "manual-coords"
    ) {
      return null;
    }

    return {
      source: parsed.source,
      label: parsed.label,
      lat: parsed.lat,
      lon: parsed.lon,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function saveLocationPreference(preference: LocationPreference): void {
  window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(preference));
}

function clearLocationPreference(): void {
  window.localStorage.removeItem(LOCATION_STORAGE_KEY);
}

export type { LocationPreference, LocationPreferenceSource, ManualCityOption };
export {
  LOCATION_STORAGE_KEY,
  MANUAL_CITY_OPTIONS,
  loadLocationPreference,
  saveLocationPreference,
  clearLocationPreference,
};
