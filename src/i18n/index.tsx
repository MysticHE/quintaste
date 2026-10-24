import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Language, LanguageChoice } from "../config/preferences";
import { loadIntroSettings, rememberIntroSettings } from "../components/splash/settings";
import { messages, type Namespace } from "./messages";

export type { Language, LanguageChoice } from "../config/preferences";
export type Vars = Record<string, string | number>;
/** A message is a string with optional {name} slots, or a function for plurals and joins. */
export type Message = string | ((vars: Vars) => string);
type Keys<N extends Namespace> = Extract<keyof (typeof messages)["en"][N], string>;

/** The phone's language; anything other than Chinese reads as English. */
export function systemLanguage(): Language {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}
export const resolveLanguage = (choice: LanguageChoice): Language => choice === "system" ? systemLanguage() : choice;

function fill(text: string, vars?: Vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => name in vars ? String(vars[name]) : whole) : text;
}
/** Looks up a message outside React (utilities, share text, notifications); falls back to English, then the key. */
export function translate<N extends Namespace>(language: Language, namespace: N, key: Keys<N>, vars?: Vars): string {
  const table = messages[language][namespace] as Record<string, Message | undefined>;
  const message = table[key] ?? (messages.en[namespace] as Record<string, Message | undefined>)[key];
  if (message === undefined) return key;
  return typeof message === "function" ? message(vars ?? {}) : fill(message, vars);
}

const LanguageContext = createContext<{ choice: LanguageChoice; setChoice: (choice: LanguageChoice) => void }>({
  choice: "system", setChoice: () => {},
});
/**
 * Me > Language is a device setting, kept with the intro's device choices, so it survives sign-in and account switches
 * and is known before any account loads. Mounted once at the root.
 */
export function LanguageProvider({ children }: PropsWithChildren) {
  const [choice, setChoiceState] = useState<LanguageChoice>("system");
  useEffect(() => {
    let live = true;
    void loadIntroSettings().then(settings => { if (live) setChoiceState(settings.language); });
    return () => { live = false; };
  }, []);
  const setChoice = useCallback((next: LanguageChoice) => {
    setChoiceState(next);
    void rememberIntroSettings({ language: next });
  }, []);
  const value = useMemo(() => ({ choice, setChoice }), [choice, setChoice]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
/** The chosen setting ("system", "en" or "zh") and how to change it. */
export const useLanguageChoice = () => useContext(LanguageContext);
/** The interface language in use. */
export function useLanguage(): Language {
  return resolveLanguage(useLanguageChoice().choice);
}
/** Keeps the web page's lang attribute in step, so screen readers pick the right voice. Mounted once in the root layout. */
export function DocumentLanguage() {
  const language = useLanguage();
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
  }, [language]);
  return null;
}
/** `const t = useT("explore"); t("searchPlaceholder")`: typed keys, so a missing Chinese message fails the type check. */
export function useT<N extends Namespace>(namespace: N) {
  const language = useLanguage();
  return useCallback((key: Keys<N>, vars?: Vars) => translate(language, namespace, key, vars), [language, namespace]);
}
