import type { ReactNode } from "react";
import { gameStill, textScale } from "../../game/settings";
import { useFood } from "../../state/Food";
import { PreferencesOverride, usePreferences } from "../../state/Preferences";

/**
 * Every game screen honours Play your way: its Reduce motion and Text size win over the app's inside the game. Screens
 * outside the game that show game art (the lotus) pass `motionOnly`, so they keep the app's text size.
 */
export function GamePreferences({ children, motionOnly = false }: { children: ReactNode; motionOnly?: boolean }) {
  const { appReducedMotion, textMultiplier } = usePreferences();
  const settings = useFood().doc.game.settings;
  return <PreferencesOverride reducedMotion={gameStill(settings, appReducedMotion)} textMultiplier={motionOnly ? textMultiplier : textScale(settings, textMultiplier)}>
    {children}
  </PreferencesOverride>;
}
