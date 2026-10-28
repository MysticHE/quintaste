import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import type { CatalogueHours } from "../types/catalogue";
import { openState } from "../utils/catalogue-hours";
import { openingLine } from "../utils/live-place-format";
import { useLanguage } from "../i18n";
import { usePreferences } from "../state/Preferences";
import { useMinuteClock } from "../components/food/Timers";

export type OpenTone = "open" | "soon" | "closed";
export type OpenStatus = { text: string; tone: OpenTone; color: string; soft: string };

/**
 * One minute clock for a screen of places (Explore, Saved, a place page), so each card does not run its own timer. A screen that
 * already keeps a minute clock passes it as `now`.
 */
const ClockContext = createContext<number | null>(null);
export function OpenClock({ now, children }: { now?: number; children: ReactNode }) {
  return now === undefined ? createElement(OwnClock, null, children) : createElement(ClockContext.Provider, { value: now }, children);
}
function OwnClock({ children }: { children: ReactNode }) {
  return createElement(ClockContext.Provider, { value: useMinuteClock() }, children);
}

/**
 * The place's open status in the same words as live places ("Open · until 9:00 pm", "Closed · opens 5:30 pm"), with its colour
 * (green open, amber closing within 30 minutes, muted closed) and a soft background; null when the hours cannot tell. Outside an
 * OpenClock it uses the time it was first shown.
 */
export function useOpenStatus(hours: CatalogueHours | undefined): OpenStatus | null {
  const language = useLanguage(), { theme } = usePreferences(), [shown] = useState(Date.now), now = useContext(ClockContext) ?? shown;
  const state = openState(hours, now);
  if (state.state === "unknown") return null;
  const tone: OpenTone = state.state === "closed" ? "closed" : state.soon ? "soon" : "open";
  const colors = tone === "open" ? { color: theme.success, soft: theme.successSoft } : tone === "soon" ? { color: theme.warning, soft: theme.warningSoft }
    : { color: theme.mutedForeground, soft: theme.muted };
  return { text: openingLine(state.state, state.state === "open" ? state.closesAt : state.opensAt, now, language), tone, ...colors };
}
