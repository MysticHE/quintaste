/**
 * Play your way (GAME_PLAN §12.2 and §12.4): how the member likes to play. Saved with game progress, passed to the
 * game on every render and honoured there. Sound, music and haptics start off (GAME_PLAN §13) and switch separately.
 * None of these change scoring rules, rewards or content.
 */
export type Pace = "normal" | "relaxed" | "slow";
export type HintLevel = "level" | "always" | "off";
export type TextChoice = "app" | "standard" | "large" | "largest";
export type PlaySettings = {
  sound: boolean; music: boolean; haptics: boolean;
  /** Short words for each sound, shown even when sound is off. */
  captions: boolean;
  /** Toggle (tap on, tap off) or hold to heat. */
  burner: "toggle" | "hold";
  pace: Pace; hints: HintLevel; text: TextChoice;
  /** Adds to the app's own reduce motion setting; it can never turn motion back on. */
  reduceMotion: boolean;
};

export const defaultSettings: PlaySettings = {
  sound: false, music: false, haptics: false, captions: false, burner: "toggle", pace: "normal", hints: "level", text: "app", reduceMotion: false,
};

/** Simulation speed per real second. The simulation itself is unchanged, so scores mean the same at every pace. */
export const PACE_SPEED: Record<Pace, number> = { normal: 1, relaxed: 0.75, slow: 0.5 };
const TEXT_SCALE: Record<Exclude<TextChoice, "app">, number> = { standard: 1, large: 1.15, largest: 1.3 };
export const textScale = (s: PlaySettings, appMultiplier: number) => (s.text === "app" ? appMultiplier : TEXT_SCALE[s.text]);
/** The level's own hint plan unless the member asked for more or none. */
export const hintsFor = (s: PlaySettings, level: "full" | "chip" | "none") => (s.hints === "always" ? "full" : s.hints === "off" ? "none" : level);

const pick = <K extends string>(v: unknown, options: readonly K[], d: K): K => (typeof v === "string" && (options as readonly string[]).includes(v) ? v as K : d);
export function readSettings(value: unknown): PlaySettings {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const flag = (k: keyof PlaySettings) => (typeof v[k] === "boolean" ? v[k] as boolean : defaultSettings[k] as boolean);
  return {
    sound: flag("sound"), music: flag("music"), haptics: flag("haptics"), captions: flag("captions"), reduceMotion: flag("reduceMotion"),
    burner: pick(v.burner, ["toggle", "hold"], "toggle"), pace: pick(v.pace, ["normal", "relaxed", "slow"], "normal"),
    hints: pick(v.hints, ["level", "always", "off"], "level"), text: pick(v.text, ["app", "standard", "large", "largest"], "app"),
  };
}
