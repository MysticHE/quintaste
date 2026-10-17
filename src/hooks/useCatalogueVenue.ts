import { useEffect, useState } from "react";
import { subscribeCatalogueVenue, type CatalogueVenueState } from "../services/catalogue-summaries";
import { useExploreLocal } from "../state/ExploreLocal";

export function useCatalogueVenue(id: string) {
  const { offline } = useExploreLocal(), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogueVenueState>({ venue: null, busy: true, error: "" });
  useEffect(() => subscribeCatalogueVenue(id, offline, setState, attempt > 0), [id, offline, attempt]);
  return { ...state, offline, retry: () => setAttempt(value => value + 1) };
}
