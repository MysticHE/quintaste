import { useCallback, useEffect, useState } from "react";
import { subscribeCatalogueVenue, type CatalogueVenueState } from "../services/catalogue-summaries";
import { useExploreLocal } from "../state/ExploreLocal";

const idle: CatalogueVenueState = { venue: null, busy: false, error: "" };
/** One place's catalogue summary (a menu summary plus kitchen, diet, hours and photo). `enabled: false` looks nothing up. */
export function useCatalogueVenue(id: string, enabled = true) {
  const { offline } = useExploreLocal(), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogueVenueState>({ venue: null, busy: true, error: "" });
  useEffect(() => enabled ? subscribeCatalogueVenue(id, offline, setState, attempt > 0) : undefined, [id, offline, attempt, enabled]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...(enabled ? state : idle), offline, retry };
}
