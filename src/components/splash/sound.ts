/**
 * The intro's sound (assets/sounds/mochi-intro.wav): a thud as the mochi squashes and a springy "boing" as it launches,
 * timed to motion.ts LANDINGS. On phones it mixes with whatever is already playing and stays quiet in silent or vibrate mode.
 * Browsers often block sound before the first tap; the web player then stays silent.
 */
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const SOURCE = require("../../../assets/sounds/mochi-intro.wav");
const VOLUME = 0.6;
type Player = { play(): void; setVolume(v: number): void; stop(): void };
let player: Player | null = null;

function report(error: unknown) {
  if (__DEV__) console.warn("Intro sound unavailable", error);
}

function nativePlayer(): Player {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(report);
  const p = createAudioPlayer(SOURCE);
  return { play: () => p.play(), setVolume: v => { p.volume = v; }, stop: () => { p.pause(); p.remove(); } };
}

function webPlayer(): Player {
  const audio = new window.Audio(Asset.fromModule(SOURCE).uri);
  audio.preload = "auto";
  // A blocked autoplay rejects; the intro simply plays without sound.
  return { play: () => { audio.play().catch(() => {}); }, setVolume: v => { audio.volume = v; }, stop: () => { audio.pause(); } };
}

/** Load while the splash is still up, so playback can start on the intro's first frame. */
export function prepareIntroSound() {
  if (player) return;
  try {
    player = Platform.OS === "web" ? webPlayer() : nativePlayer();
    player.setVolume(VOLUME);
  } catch (error) {
    report(error);
    player = null;
  }
}

export function playIntroSound() {
  try {
    player?.play();
  } catch (error) {
    report(error);
  }
}

/** Fade out over `ms` (a skip), then free the player. */
export function releaseIntroSound(ms = 0) {
  const current = player;
  player = null;
  if (!current) return;
  const steps = Math.max(1, Math.round(ms / 30));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    try {
      current.setVolume(VOLUME * Math.max(0, 1 - step / steps));
      if (step >= steps) {
        clearInterval(timer);
        current.stop();
      }
    } catch (error) {
      clearInterval(timer);
      report(error);
    }
  }, 30);
}
