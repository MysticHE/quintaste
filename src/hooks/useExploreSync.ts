import { useEffect } from "react";
import { AppState } from "react-native";

export function useExploreSync(eligible: boolean, wake: string, refresh: () => Promise<unknown>, cancel: () => void) {
  useEffect(() => {
    if (!eligible) { cancel(); return; }
    if (AppState.currentState !== "background" && AppState.currentState !== "inactive") void refresh();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void refresh(); else cancel(); });
    return () => { listener.remove(); cancel(); };
  }, [eligible, refresh, cancel]);
  useEffect(() => {
    if (!eligible || !wake) return;
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 15000);
    return () => clearInterval(timer);
  }, [eligible, wake, refresh]);
}
