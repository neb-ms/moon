import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";
import { LOCATION_STORAGE_KEY } from "../src/location/locationPreference";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

function setGeolocationMock(
  implementation: (
    success: PositionCallback,
    error?: PositionErrorCallback | null,
  ) => void,
) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: implementation,
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } satisfies Geolocation,
  });
}

describe("Location permission and fallback flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores preference after device location permission is granted", async () => {
    setGeolocationMock((success) => {
      success({
        coords: {
          latitude: 47.6062,
          longitude: -122.3321,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    renderApp("/");

    expect(screen.getByText("Location Access")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use Device Location" }));

    await waitFor(() => {
      expect(screen.getByText("47.606, -122.332")).toBeInTheDocument();
    });

    expect(screen.queryByText("Location Access")).not.toBeInTheDocument();

    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      source: "device",
      lat: 47.6062,
      lon: -122.3321,
    });
  });

  it("falls back to manual entry when permission is denied", async () => {
    setGeolocationMock((_, error) => {
      error?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    });

    renderApp("/");

    fireEvent.click(screen.getByRole("button", { name: "Use Device Location" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a city or coordinates")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Location permission was denied. Enter your location manually.",
    );

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "chicago" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Location" }));

    await waitFor(() => {
      expect(screen.getByText("Chicago, IL")).toBeInTheDocument();
    });

    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      source: "manual-city",
      label: "Chicago, IL",
      lat: 41.8781,
      lon: -87.6298,
    });
  });
});
