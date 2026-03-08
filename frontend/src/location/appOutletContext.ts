import type { LocationPreference } from "./locationPreference";

type AppOutletContext = {
  hasLoadedPreference: boolean;
  locationPreference: LocationPreference | null;
};

export type { AppOutletContext };
