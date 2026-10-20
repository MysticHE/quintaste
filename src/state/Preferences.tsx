import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AccessibilityInfo, Platform, useColorScheme } from "react-native";
import {
  defaults,
  readPreferences,
  type Preferences,
} from "../config/preferences";
import { themeFor } from "../theme/tokens";
import { useAuth } from "./Auth";
type Notice = { text: string; error?: boolean; preferenceRetry?: 'load' | 'save' } | null;
function useStoredPreferences() {
  const { user } = useAuth();
  const storageKey = "@quintaste/preview-preferences-v1" + (user ? "/" + user.id : "");
  const [draft, setDraft] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(current => current === notice ? null : current), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const current = useRef<Preferences>(defaults);
  const persisted = useRef<Preferences>(defaults);
  const readable = useRef(false);
  const revision = useRef(0);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      await queue.current;
      const raw = await AsyncStorage.getItem(storageKey);
      const next = raw ? readPreferences(JSON.parse(raw)) : defaults;
      if (alive.current) {
        current.current = next;
        persisted.current = next;
        readable.current = true;
        setDraft(next);
        setSaved(next);
        setStorageReady(true);
        setNotice(message => message?.preferenceRetry === 'load' ? null : message);
      }
    } catch {
      if (alive.current)
        setNotice({
          text: "Saved choices could not be loaded. Tap Retry before saving new choices.",
          error: true,
          preferenceRetry: 'load',
        });
    } finally {
      if (alive.current) setReady(true);
    }
  }, [storageKey]);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(load);
    return () => {
      alive.current = false;
    };
  }, [load]);
  const save = useCallback((override?: Partial<Preferences>) => {
    if (!readable.current) {
      setNotice({
        text: "Retry loading saved choices before saving.",
        error: true,
        preferenceRetry: 'load',
      });
      return Promise.resolve(false);
    }
    const candidate = { ...current.current, ...override };
    // An incomplete name stays visible while other valid settings can still save.
    const snapshot = readPreferences({ ...candidate, displayName: candidate.displayName.trim() || persisted.current.displayName });
    if (override) { current.current = candidate; setDraft(candidate); }
    const serial = ++revision.current;
    setSaving(true);
    const operation = queue.current.catch(() => false)
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(snapshot)))
      .then(() => {
        if (alive.current && serial === revision.current) {
          persisted.current = snapshot;
          setSaved(snapshot);
          setNotice(message => message?.preferenceRetry === 'save' ? null : message);
        }
        return true;
      })
      .catch(() => {
        if (alive.current && serial === revision.current)
          setNotice({
            text: "Changes could not be saved. Your changes are still here. Tap Retry.",
            error: true,
            preferenceRetry: 'save',
          });
        return false;
      })
      .finally(() => {
        if (alive.current && serial === revision.current) setSaving(false);
      });
    queue.current = operation;
    return operation;
  }, [storageKey]);
  const patch = useCallback((next: Partial<Preferences>) => {
    if (!readable.current) return;
    current.current = { ...current.current, ...next };
    setDraft(current.current);
    void save();
  }, [save]);
  return {
    draft,
    saved,
    patch,
    save,
    ready,
    saving,
    storageReady,
    reload: load,
    notice,
    setNotice,
  };
}
function useDeviceMotion() {
  const [systemMotion, setSystemMotion] = useState(false);
  useEffect(() => {
    const alive = { current: true };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive.current) setSystemMotion(value);
      })
      .catch(() => {
        if (alive.current) setSystemMotion(true);
      });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemMotion,
    );
    return () => {
      alive.current = false;
      listener.remove();
    };
  }, []);
  return systemMotion;
}
function usePreferenceState() {
  const { user } = useAuth();
  const state = useStoredPreferences();
  const { draft, notice } = state;
  const [preview, setPreview] = useState(!!user);
  const systemMotion = useDeviceMotion();
  const scheme = useColorScheme();
  useEffect(() => {
    if (notice && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibilityWithOptions(notice.text, {
        queue: !notice.error,
      });
    }
  }, [notice]);
  const dark =
    draft.mode === "dark" || (draft.mode === "system" && scheme === "dark");
  return {
    ...state,
    preview,
    setPreview,
    theme: themeFor(draft.palette, dark),
    reducedMotion: draft.reduceMotion || systemMotion,
    /** The app and phone's own answer; a game screen may override `reducedMotion` (PreferencesOverride). */
    appReducedMotion: draft.reduceMotion || systemMotion,
    textMultiplier:
      draft.textSize === "larger" ? 1.3 : draft.textSize === "large" ? 1.15 : 1,
    dirty: JSON.stringify(draft) !== JSON.stringify(state.saved),
  };
}
const Context = createContext<ReturnType<typeof usePreferenceState> | null>(
  null,
);
export function PreferencesProvider({ children }: PropsWithChildren) {
  return (
    <Context.Provider value={usePreferenceState()}>{children}</Context.Provider>
  );
}
/**
 * Lets one part of the app (the game, whose Play your way settings win inside it) change motion and text size for
 * everything below it. Every other preference is inherited.
 */
export function PreferencesOverride({ reducedMotion, textMultiplier, children }: PropsWithChildren<{ reducedMotion: boolean; textMultiplier: number }>) {
  const parent = usePreferences();
  const value = useMemo(() => ({ ...parent, reducedMotion, textMultiplier }), [parent, reducedMotion, textMultiplier]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider is required");
  return value;
}
