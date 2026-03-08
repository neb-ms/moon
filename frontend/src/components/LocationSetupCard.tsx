import { useState } from "react";

import { MANUAL_CITY_OPTIONS } from "../location/locationPreference";

type ManualCoordinatesInput = {
  label: string;
  lat: number;
  lon: number;
};

type LocationSetupCardProps = {
  geolocationSupported: boolean;
  message: string | null;
  mode: "prompt" | "manual";
  requestingDeviceLocation: boolean;
  onOpenManualEntry: () => void;
  onRequestDeviceLocation: () => void;
  onSaveManualCity: (cityId: string) => void;
  onSaveManualCoordinates: (input: ManualCoordinatesInput) => void;
};

function LocationSetupCard({
  geolocationSupported,
  message,
  mode,
  requestingDeviceLocation,
  onOpenManualEntry,
  onRequestDeviceLocation,
  onSaveManualCity,
  onSaveManualCoordinates,
}: LocationSetupCardProps) {
  if (mode === "manual") {
    return (
      <ManualEntryForm
        message={message}
        onSaveManualCity={onSaveManualCity}
        onSaveManualCoordinates={onSaveManualCoordinates}
      />
    );
  }

  return (
    <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-5 shadow-panel">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Location Access</p>
      <h2 className="mt-3 font-display text-2xl leading-tight">Use your location for moon times</h2>
      <p className="mt-3 text-sm text-muted">
        Project Lunar uses location for accurate moonrise and moonset calculations. You can allow
        device location or enter one manually.
      </p>

      {!geolocationSupported && (
        <p className="mt-3 text-sm text-muted">
          Device location is unavailable in this browser. Use manual entry below.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg border border-edge/70 bg-bg/40 px-3 py-2 text-sm text-muted" role="alert">
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          className="rounded-lg border border-accent/70 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent"
          disabled={!geolocationSupported || requestingDeviceLocation}
          onClick={onRequestDeviceLocation}
          type="button"
        >
          {requestingDeviceLocation ? "Requesting..." : "Use Device Location"}
        </button>
        <button
          className="rounded-lg border border-edge/70 px-4 py-2 text-sm text-text transition hover:border-accent/50"
          onClick={onOpenManualEntry}
          type="button"
        >
          Enter Manually
        </button>
      </div>
    </article>
  );
}

type ManualEntryFormProps = {
  message: string | null;
  onSaveManualCity: (cityId: string) => void;
  onSaveManualCoordinates: (input: ManualCoordinatesInput) => void;
};

function ManualEntryForm({ message, onSaveManualCity, onSaveManualCoordinates }: ManualEntryFormProps) {
  const [entryType, setEntryType] = useState<"city" | "coords">("city");
  const [cityId, setCityId] = useState(MANUAL_CITY_OPTIONS[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (entryType === "city") {
      if (!cityId) {
        setFormError("Please choose a city.");
        return;
      }

      onSaveManualCity(cityId);
      return;
    }

    const lat = Number(latInput);
    const lon = Number(lonInput);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setFormError("Latitude and longitude must be valid numbers.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setFormError("Latitude must be between -90 and 90.");
      return;
    }

    if (lon < -180 || lon > 180) {
      setFormError("Longitude must be between -180 and 180.");
      return;
    }

    onSaveManualCoordinates({
      label: label.trim(),
      lat,
      lon,
    });
  }

  return (
    <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-5 shadow-panel">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Manual Location</p>
      <h2 className="mt-3 font-display text-2xl leading-tight">Enter a city or coordinates</h2>

      {message && (
        <p className="mt-3 rounded-lg border border-edge/70 bg-bg/40 px-3 py-2 text-sm text-muted" role="alert">
          {message}
        </p>
      )}

      <fieldset className="mt-4 grid grid-cols-2 gap-2">
        <legend className="sr-only">Manual entry type</legend>
        <button
          aria-pressed={entryType === "city"}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            entryType === "city"
              ? "border-accent bg-accent/10 text-accent"
              : "border-edge/70 text-text hover:border-accent/50"
          }`}
          onClick={() => setEntryType("city")}
          type="button"
        >
          City
        </button>
        <button
          aria-pressed={entryType === "coords"}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            entryType === "coords"
              ? "border-accent bg-accent/10 text-accent"
              : "border-edge/70 text-text hover:border-accent/50"
          }`}
          onClick={() => setEntryType("coords")}
          type="button"
        >
          Latitude / Longitude
        </button>
      </fieldset>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {entryType === "city" ? (
          <label className="block text-sm text-muted">
            City
            <select
              className="mt-1 w-full rounded-lg border border-edge/70 bg-bg/50 px-3 py-2 text-text"
              onChange={(event) => {
                setFormError(null);
                setCityId(event.target.value);
              }}
              value={cityId}
            >
              {MANUAL_CITY_OPTIONS.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="block text-sm text-muted">
              Location Label (optional)
              <input
                className="mt-1 w-full rounded-lg border border-edge/70 bg-bg/50 px-3 py-2 text-text"
                onChange={(event) => {
                  setFormError(null);
                  setLabel(event.target.value);
                }}
                placeholder="Home"
                type="text"
                value={label}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm text-muted">
                Latitude
                <input
                  className="mt-1 w-full rounded-lg border border-edge/70 bg-bg/50 px-3 py-2 text-text"
                  onChange={(event) => {
                    setFormError(null);
                    setLatInput(event.target.value);
                  }}
                  placeholder="40.7128"
                  step="any"
                  type="number"
                  value={latInput}
                />
              </label>
              <label className="block text-sm text-muted">
                Longitude
                <input
                  className="mt-1 w-full rounded-lg border border-edge/70 bg-bg/50 px-3 py-2 text-text"
                  onChange={(event) => {
                    setFormError(null);
                    setLonInput(event.target.value);
                  }}
                  placeholder="-74.0060"
                  step="any"
                  type="number"
                  value={lonInput}
                />
              </label>
            </div>
          </>
        )}

        {formError && (
          <p className="rounded-lg border border-edge/70 bg-bg/40 px-3 py-2 text-sm text-muted" role="alert">
            {formError}
          </p>
        )}

        <button
          className="w-full rounded-lg border border-accent/70 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent"
          type="submit"
        >
          Save Location
        </button>
      </form>
    </article>
  );
}

export default LocationSetupCard;
