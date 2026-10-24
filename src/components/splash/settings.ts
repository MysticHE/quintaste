/**
 * Device-level choices that must work before any account loads: Sounds and Reduce Motion for the intro, and the
 * interface language (Me > Language), which belongs to the device so it survives sign-in and account switches. The root
 * layout mirrors Sounds and Reduce Motion here whenever preferences are ready. Missing or unreadable: sounds on, motion
 * on, phone language.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { languageChoices, type LanguageChoice } from "../../config/preferences";

const KEY = "@quintaste/intro-settings";
export type IntroSettings = { sounds: boolean; reduceMotion: boolean; language: LanguageChoice };
const DEFAULTS: IntroSettings = { sounds: true, reduceMotion: false, language: "system" };
let loaded: Promise<IntroSettings> | null = null;

export function loadIntroSettings(): Promise<IntroSettings> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then(raw => {
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (!value || typeof value !== "object") return DEFAULTS;
      const v = value as Record<string, unknown>;
      const language = languageChoices.find(choice => choice === v.language) ?? DEFAULTS.language;
      return { sounds: v.sounds !== false, reduceMotion: v.reduceMotion === true, language };
    })
    .catch(error => {
      if (__DEV__) console.warn("Intro settings unreadable", error);
      return DEFAULTS;
    });
  return loaded;
}

/** Saves some of the device choices, keeping the rest; readers later in this session see the change. */
export function rememberIntroSettings(change: Partial<IntroSettings>): Promise<IntroSettings> {
  loaded = loadIntroSettings().then(current => {
    const next = { ...current, ...change };
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(error => {
      if (__DEV__) console.warn("Intro settings not saved", error);
    });
    return next;
  });
  return loaded;
}
