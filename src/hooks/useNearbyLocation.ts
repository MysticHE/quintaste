import { Linking, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { locationMode, withLocationMode } from "../utils/discovery-filters";
import { useFood } from "../state/Food";
import { useDiscovery } from "../state/Discovery";
import { inSingapore } from "../utils/discovery-search";
import { nearbyPosition } from "../utils/nearby-position";
import { locationIssue, locationMessages, type LocationIssue } from "../utils/location-feedback";
import { useT } from "../i18n";

export function useNearbyLocation() {
  const { owner, setFilters, filters, setSearch, search } = useFood();
  const { setLocation, setSelection, selection, clear } = useDiscovery();
  const [busy, setBusy] = useState(false), [issue, setIssue] = useState<LocationIssue | null>(null), t = useT("explore");
  const sequence = useRef(0), mounted = useRef(true), pending = useRef<number | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current += 1; pending.current = null; }; }, [owner]);
  useFocusEffect(useCallback(() => () => { sequence.current += 1; pending.current = null; setBusy(false); setIssue(null); }, []));
  // Only a change of where to search cancels a pending GPS request; diet or saved-only edits do not.
  const mode = locationMode(filters);
  useEffect(() => () => { sequence.current += 1; pending.current = null; setBusy(false); setIssue(null); }, [search, selection, mode]);
  const cancel = useCallback(() => { sequence.current += 1; pending.current = null; setBusy(false); setIssue(null); }, []);
  const locate = async () => {
    if (pending.current !== null) return false;
    const attempt = ++sequence.current; pending.current = attempt;
    let finished = false;
    const current = () => mounted.current && sequence.current === attempt && !finished;
    setBusy(true); setIssue(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([
        nearbyPosition(current),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 20000); }),
      ]);
      if (!current() || !position) return false;
      const point = { latitude: Math.round(position.coords.latitude * 1000) / 1000, longitude: Math.round(position.coords.longitude * 1000) / 1000 };
      if (!inSingapore(point)) { setIssue("outside"); return false; }
      setSelection(null); setSearch("");
      setLocation({ ...point, capturedAt: Date.now(), accuracy: position.coords.accuracy });
      clear(); void setFilters(current => withLocationMode(current, "selected"));
      return true;
    } catch (problem) {
      if (current()) setIssue(locationIssue(problem));
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
      if (current()) setBusy(false);
      if (pending.current === attempt) pending.current = null;
      finished = true;
    }
  };
  const settings = Platform.OS !== "web" && (issue === "settings" || issue === "permission");
  const recover = async () => {
    if (!settings) return locate();
    const attempt = sequence.current;
    try {
      if (Platform.OS === "android" && issue === "settings") await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      else await Linking.openSettings();
    } catch { if (mounted.current && sequence.current === attempt) setIssue("unavailable"); }
  };
  return { locate, cancel, busy, error: issue ? t(locationMessages[issue]) : "", recover,
    recoveryLabel: issue === "outside" ? "" : settings ? "Settings" : "Retry", dismiss: () => setIssue(null) };
}
