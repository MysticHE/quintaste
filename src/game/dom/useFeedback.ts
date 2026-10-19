import { useEffect, useRef, useState } from "react";
import { STATIONS, type StationKind } from "../content/dishes";
import * as sim from "../sim/engine";
import type { PlaySettings } from "../settings";
import { CAPTIONS, GameAudio, type Sfx } from "./audio";

export type HapticKind = "light" | "select" | "success" | "warning";
const HAPTIC: Partial<Record<Sfx, HapticKind>> = { place: "light", plate: "light", coin: "light", serve: "success", returned: "warning", scorch: "warning" };

/**
 * Sound, captions and haptics for a service (GAME_PLAN §13): an effect per simulation event, a sizzle that follows the
 * heat, and a haptic tick when a cooking station enters or leaves its heat band. Haptics run in the app through
 * `onHaptic`; each switch is honoured separately, and with everything off this does nothing.
 */
export function useFeedback(settings: PlaySettings, onHaptic: ((kind: HapticKind) => Promise<void>) | undefined) {
  const [audio] = useState(() => new GameAudio());
  const latest = useRef({ settings, onHaptic });
  useEffect(() => { latest.current = { settings, onHaptic }; });
  const [caption, setCaption] = useState<{ text: string; key: number } | null>(null);
  const band = useRef<Partial<Record<StationKind, boolean>>>({}), lastHaptic = useRef(0);

  useEffect(() => { audio.set(settings.sound, settings.music); }, [audio, settings.sound, settings.music]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => { if (!caption) return; const t = setTimeout(() => setCaption(null), 1400); return () => clearTimeout(t); }, [caption]);

  function haptic(kind: HapticKind) {
    const { settings: s, onHaptic: send } = latest.current, now = Date.now();
    if (!s.haptics || !send || now - lastHaptic.current < 90) return;
    lastHaptic.current = now; void send(kind).catch(() => {});
  }
  /** Plays one effect with its caption and haptic. */
  function cue(kind: Sfx, n = 0) {
    audio.play(kind, n);
    if (latest.current.settings.captions && (kind !== "coin" || n === 0)) setCaption({ text: CAPTIONS[kind], key: Date.now() });
    const h = HAPTIC[kind]; if (h) haptic(h);
  }
  /** After each tick: sizzle follows the hottest pan with food in it; band changes give a light tick. */
  function follow(r: sim.Run) {
    let sizzle = 0;
    const live = r.started && !r.ended && !r.paused && !r.label;
    for (const st of Object.values(r.stations)) {
      if (!st || !STATIONS[st.kind].heat) continue;
      const pr = st.part, cooking = live && !!pr && (pr.state === "cooking" || pr.state === "waiting"), [lo, hi] = sim.bandOf(st, pr);
      if (cooking && st.H >= lo - 0.05) sizzle = Math.max(sizzle, Math.min(1, 0.4 + st.H));
      const inBand = cooking && st.H >= lo && st.H <= hi;
      if (cooking && band.current[st.kind] !== undefined && band.current[st.kind] !== inBand) haptic("select");
      band.current[st.kind] = cooking ? inBand : undefined;
    }
    audio.setSizzle(sizzle);
  }
  return { audio, caption, cue, follow, haptic };
}
