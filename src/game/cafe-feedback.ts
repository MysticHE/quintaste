/**
 * Sound, music and haptics for the Game tab and My little café, honouring Play your way (Rush Hour has its own Web
 * Audio inside the game page, src/game/dom/audio.ts). Sounds come from scripts/make-cafe-sounds.py. Nothing loads
 * until its switch is on; the music-box loop plays only while a café screen is focused and the app is in front, and
 * mixes with whatever else is playing. Silent mode keeps sounds quiet on iPhone.
 */
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { Asset } from "expo-asset";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import type { PlaySettings } from "./settings";

export type CafeSound = "tap" | "boing" | "enter";
export type CafeHaptic = "tap" | "tick" | "done";
type Key = CafeSound | "music";
type Player = { play(): void; pause(): void; restart(): void };

const SOURCES: Record<Key, number> = {
  tap: require("../../assets/sounds/cafe-tap.m4a"),
  boing: require("../../assets/sounds/cafe-boing.m4a"),
  enter: require("../../assets/sounds/cafe-enter.m4a"),
  music: require("../../assets/sounds/cafe-music.m4a"),
};
const EFFECTS: CafeSound[] = ["tap", "boing", "enter"];
const VOLUME: Record<Key, number> = { tap: 0.5, boing: 0.45, enter: 0.6, music: 0.32 };
const players: Partial<Record<Key, Player>> = {};
let modeSet = false;
/** Screens that want the music now. Moving from the Game tab into the café hands it over without a gap or a race. */
const listeners = new Set<symbol>();
function syncMusic() {
  if (listeners.size) player("music")?.play();
  else players.music?.pause();
}

function report(error: unknown) {
  if (__DEV__) console.warn("Café sound unavailable", error);
}

function nativePlayer(key: Key): Player {
  if (!modeSet) { modeSet = true; setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(report); }
  const p = createAudioPlayer(SOURCES[key]);
  p.volume = VOLUME[key];
  p.loop = key === "music";
  // A new player already starts at 0, and seeking one that is still loading can fail, so its first play skips the seek.
  let played = false;
  const play = () => { played = true; p.play(); };
  return { play, pause: () => p.pause(), restart: () => { if (!played) { play(); return; } void p.seekTo(0).then(() => p.play()).catch(report); } };
}

function webPlayer(key: Key): Player {
  const audio = new window.Audio(Asset.fromModule(SOURCES[key]).uri);
  audio.preload = "auto";
  audio.volume = VOLUME[key];
  audio.loop = key === "music";
  // Browsers refuse sound before the first tap: the music tries again on the next tap; an effect is simply skipped.
  const play = () => { audio.play().catch(() => { if (key === "music") window.addEventListener("pointerdown", syncMusic, { once: true }); }); };
  return { play, pause: () => audio.pause(), restart: () => { audio.currentTime = 0; play(); } };
}

function player(key: Key): Player | null {
  try {
    players[key] ??= Platform.OS === "web" ? webPlayer(key) : nativePlayer(key);
    return players[key]!;
  } catch (error) {
    report(error);
    return null;
  }
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", s => setActive(s === "active"));
    return () => sub.remove();
  }, []);
  return active;
}

const HAPTIC: Record<CafeHaptic, () => Promise<void>> = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  tick: () => Haptics.selectionAsync(),
  done: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

/** Café feedback for one screen; `focused` is whether that screen is the one on show. */
export function useCafeFeedback(settings: PlaySettings, focused: boolean) {
  const active = useAppActive(), music = settings.music && focused && active, [id] = useState(() => Symbol("cafe"));
  useEffect(() => {
    if (!music) return;
    listeners.add(id); syncMusic();
    return () => { listeners.delete(id); setTimeout(syncMusic, 0); };
  }, [music, id]);
  // Load the effects as soon as Sound effects is on, so the first tap is not spent loading.
  useEffect(() => { if (settings.sound) EFFECTS.forEach(player); }, [settings.sound]);
  const sound = useCallback((kind: CafeSound) => { if (settings.sound) player(kind)?.restart(); }, [settings.sound]);
  const buzz = useCallback((kind: CafeHaptic) => { if (settings.haptics && Platform.OS !== "web") HAPTIC[kind]().catch(report); }, [settings.haptics]);
  return { sound, buzz };
}
