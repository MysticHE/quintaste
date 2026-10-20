import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { daypartAt, type DaypartNow } from "../utils/daypart";

/**
 * The Singapore time of day for ordering the Cook feed, read when the screen opens, regains focus or the app returns to
 * the foreground; never on a timer, so cards do not move while someone is scrolling past 5:30 pm.
 */
export function useDaypart(): { now: DaypartNow; at: number } {
  const [state, setState] = useState(() => { const at = Date.now(); return { at, now: daypartAt(at) }; });
  const refresh = useCallback(() => setState(current => {
    const at = Date.now(), now = daypartAt(at);
    return now.part === current.now.part && now.day === current.now.day ? current : { at, now };
  }), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", next => { if (next === "active") refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  return state;
}
