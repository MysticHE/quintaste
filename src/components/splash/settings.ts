/**
 * The intro starts before any account or its preferences load, so it reads a device-level copy of the two choices
 * it needs: Sounds and Reduce Motion. The root layout mirrors them here whenever preferences are ready, so the
 * next launch follows the last choice made on this device. Missing or unreadable: sounds on, motion on.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@quintaste/intro-settings";
export type IntroSettings = { sounds: boolean; reduceMotion: boolean };
const DEFAULTS: IntroSettings = { sounds: true, reduceMotion: false };
let loaded: Promise<IntroSettings> | null = null;

export function loadIntroSettings(): Promise<IntroSettings> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then(raw => {
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (!value || typeof value !== "object") return DEFAULTS;
      const v = value as Record<string, unknown>;
      return { sounds: v.sounds !== false, reduceMotion: v.reduceMotion === true };
    })
    .catch(error => {
      if (__DEV__) console.warn("Intro settings unreadable", error);
      return DEFAULTS;
    });
  return loaded;
}

export function rememberIntroSettings(settings: IntroSettings) {
  AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(error => {
    if (__DEV__) console.warn("Intro settings not saved", error);
  });
}
