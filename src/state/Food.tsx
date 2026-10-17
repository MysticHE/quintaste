import type { Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from "react";
import type { SavedSelection, FoodDocument, LocalCase, SavedItem, SavedKind } from "../types/food";
import type { CookBrowse } from "../types/recipe-workspace";
import type { LocationSuggestion } from "../types/location-search";
import { useScopedValue } from "../hooks/useScopedValue";
import { useDiscoverySettings } from "../hooks/useDiscoverySettings";
import { timerRemaining } from "../utils/food-format";
import { emptyFoodDocument, mergeFoodDocuments, readFoodDocument } from "./food-schema";
import { useFoodStorage, foodKey } from "./useFoodStorage";
import { FoodCapacityError, foodDocumentByteLimit, serializeFoodDocument, utf8Bytes } from "./food-capacity";
import { usePreferences } from "./Preferences";
import { ExploreCapacityError } from "../utils/explore-local-schema";
import { MarketCapacityError } from "./market-schema";
import { MeetCapacityError } from "./meet-schema";
import { cookingRecipeById } from "../utils/private-recipes";
import { useAuth } from "./Auth";
import { accountsEnabled, authClient } from "../services/auth-client";
import { useAccountAvatars } from "../hooks/useAccountAvatars";

export { defaultFilters } from "../config/discovery";
export function localId(prefix: string) { return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9); }
function useFoodState() {
  const { user } = useAuth();
  const { preview, setPreview, setNotice } = usePreferences();
  const owner: "profile" | "guest" = preview ? "profile" : "guest";
  const storage = useFoodStorage(foodKey(owner, user?.id));
  const { document, update: updateStorage, commit: commitStorage } = storage;
  const doc = useMemo(() => user ? { ...document, adultConfirmed: !!user.adultConfirmed } : document, [document, user]);
  const overCapacity = useMemo(() => utf8Bytes(JSON.stringify(doc)) > foodDocumentByteLimit, [doc]);
  const update = useCallback(async (change: (document: FoodDocument) => FoodDocument) => {
    try { return await updateStorage(change); }
    catch (error) {
      if (!(error instanceof FoodCapacityError)) throw error;
      setNotice({ text: error.message, error: true }); return false;
    }
  }, [updateStorage, setNotice]);
  const commit = useCallback(async (change: (document: FoodDocument) => FoodDocument) => {
    try { return await commitStorage(change); }
    catch (error) {
      if (!(error instanceof FoodCapacityError)) throw error;
      setNotice({ text: error.message, error: true }); return false;
    }
  }, [commitStorage, setNotice]);
  const avatarLibrary = useAccountAvatars({ scope: foodKey(owner, user?.id),
    enabled: accountsEnabled && owner === "profile" && !!user?.adultConfirmed && storage.ready && storage.readable,
    avatar: doc.avatar, update });
  const discoveryScope = foodKey(owner, user?.id);
  const [discoveryQuery, setDiscoveryQuery] = useScopedValue(discoveryScope, "");
  const [searchSelection, setSearchSelection] = useScopedValue<LocationSuggestion | null>(discoveryScope, null);
  const [search, setSearch] = useScopedValue(discoveryScope, "");
  const { filters, setFilters, followDefault, radius, setRadius } = useDiscoverySettings(doc, update);
  const [cookSearch, setCookSearch] = useScopedValue(owner, "");
  const cookBrowse = doc.recipes.browse;
  const setCookBrowse = (patch: Partial<CookBrowse>) => update(current => ({ ...current, recipes: { ...current.recipes, browse: { ...current.recipes.browse, ...patch } } }));
  const [savedSearch, setSavedSearch] = useScopedValue(owner, "");
  const [savedSelection, setSavedSelection] = useScopedValue<SavedSelection>(owner, { category: "All", list: "" });
  const [undo, setUndo] = useState<{ owner: string; item: SavedItem } | null>(null);
  const undoVersion = useRef({ guest: 0, profile: 0 });
  const [profileRoute, setProfileRoute] = useState<Href | null>(null);
  const [mergeCount, setMergeCount] = useState(0);
  const [pendingSignup, setPendingSignup] = useState<{ name: string; returnTo: string } | null>(null);
  const isSaved = useCallback((kind: SavedKind, id: string) => doc.saves.some(item => item.kind === kind && item.id === id), [doc.saves]);
  const toggleSave = async (kind: SavedKind, id: string, catalogueLabel?: string) => {
    const version = undoVersion.current[owner];
    const saved = doc.saves.find(item => item.kind === kind && item.id === id);
    if (!saved && doc.saves.length >= 500) { setNotice({ text: "Your local collection is full. Remove an item before saving another.", error: true }); return; }
    const okay = await update(current => ({ ...current,
      exploreLocal: !saved && kind === "place" && id.startsWith("catalogue-") && catalogueLabel
        ? { ...current.exploreLocal, labels: { ...current.exploreLocal.labels, [id]: current.exploreLocal.labels[id] ?? catalogueLabel.slice(0, 80) } } : current.exploreLocal,
      saves: saved ? current.saves.filter(item => item.kind !== kind || item.id !== id)
      : [...current.saves.filter(item => item.kind !== kind || item.id !== id), { kind, id, savedAt: Date.now(), list: "" }] }));
    if (saved && version === undoVersion.current[owner]) setUndo({ owner, item: saved });
    if (okay) setNotice({ text: saved ? "Removed from Saved. You can undo in Saved." : "Saved on this device." });
  };
  const undoRemove = async () => {
    if (!undo || undo.owner !== owner) return;
    const item = undo.item;
    const okay = await update(current => ({ ...current, saves: current.saves.some(saved => saved.kind === item.kind && saved.id === item.id) ? current.saves : [...current.saves, item] }));
    if (okay) { setUndo(null); setNotice({ text: "Restored to Saved." }); }
  };
  const saveNote = (key: string, note: string) => update(current => ({ ...current, notes: { ...current.notes, [key]: note.trim().slice(0, 2000) } }));
  const addCase = async (draft: Omit<LocalCase, "id" | "createdAt" | "status">) => {
    if (doc.cases.length >= 100) return false;
    return update(current => ({ ...current, cases: [{ ...draft, id: localId("case"), createdAt: Date.now(), status: "not-sent" }, ...current.cases] }));
  };
  const openPreview = async (adult = false, returnTo?: Href) => {
    if (accountsEnabled) {
      setNotice({ text: "Use Sign in to open your account collection.", error: true });
      return null;
    }
    // Already in the profile: confirm age through the live collection so a stale in-memory copy cannot overwrite it.
    if (preview) {
      if (adult && !await update(doc => ({ ...doc, adultConfirmed: true }))) return null;
      return { mergeCount: 0 };
    }
    try {
      const result = await storage.withScopeLock(async snapshot => {
        const raw = await AsyncStorage.getItem(foodKey("profile"));
        const profile = raw ? readFoodDocument(JSON.parse(raw)) : emptyFoodDocument();
        if (adult) await AsyncStorage.setItem(foodKey("profile"), serializeFoodDocument({ ...profile, adultConfirmed: true }));
        const count = snapshot.saves.length + Object.values(snapshot.notes).filter(Boolean).length +
          snapshot.privatePlaces.length + snapshot.cases.length + snapshot.exploreLocal.drafts.length + Object.keys(snapshot.exploreLocal.labels).length + snapshot.lists.length + snapshot.timers.length + (snapshot.cooking ? 1 : 0) +
          snapshot.recipes.drafts.length + snapshot.recipes.shopping.length + snapshot.market.listings.length + snapshot.market.saved.length + snapshot.market.threads.length +
          snapshot.social.network.reminders.length;
        setProfileRoute(returnTo ?? null); setMergeCount(count); setPreview(true);
        setNotice({ text: "Local preview profile opened. Account sign-in and sync are not connected." });
        return { mergeCount: count };
      });
      if (!result) setNotice({ text: "Save or retry your current collection before switching profiles. Your draft is still here.", error: true });
      return result;
    } catch (error) {
      setNotice({ text: error instanceof FoodCapacityError ? error.message : "The local profile could not be loaded. Stay as a guest and try again.", error: true });
      return null;
    }
  };
  /** Signs out (or leaves the local profile). `force` signs out even when device changes are unsaved, so a shared device is never stuck signed in. */
  const leavePreview = async (force = false) => {
    const leave = async () => {
      if (user) {
        const result = await authClient.signOut();
        if (result.error) { setNotice({ text: "Sign-out could not be completed. Please retry.", error: true }); return false; }
      }
      setPreview(false); setNotice(null); return true;
    };
    const okay = force && user ? await leave() : await storage.withScopeLock(leave, true);
    if (okay === null && !user) setNotice({ text: "Retry saving this collection before switching. Your unsaved draft is still here.", error: true });
    return okay === null ? "unsaved" as const : okay;
  };
  const mergeGuest = async () => {
    try {
      const raw = await AsyncStorage.getItem(foodKey("guest"));
      const guest = raw ? readFoodDocument(JSON.parse(raw)) : emptyFoodDocument();
      const okay = await update(current => mergeFoodDocuments(current, guest));
      if (okay) { setMergeCount(0); setNotice({ text: "Guest items copied into this local profile. Guest originals are kept." }); }
      return okay;
    } catch (error) {
      setNotice({ text: error instanceof MarketCapacityError || error instanceof ExploreCapacityError || error instanceof MeetCapacityError ? error.message : "Guest data could not be read. Nothing was merged.", error: true }); return false;
    }
  };
  const startTimer = (recipeId: string, label: string, seconds: number) => {
    if (!label.trim() || !Number.isInteger(seconds) || seconds < 1 || seconds > 86400 || !cookingRecipeById(recipeId, doc.recipes)) {
      setNotice({ text: "Choose a recipe, timer label and valid duration.", error: true }); return Promise.resolve(false);
    }
    if (doc.timers.length >= 20) { setNotice({ text: "You have 20 timers. Dismiss one before starting another.", error: true }); return Promise.resolve(false); }
    return update(current => current.timers.length >= 20 ? current : ({ ...current, timers: [...current.timers, {
      id: localId("timer"), recipeId, label: label.trim().slice(0, 80), duration: seconds, remaining: seconds,
      endsAt: Date.now() + seconds * 1000, createdAt: Date.now(),
    }] }));
  };
  const changeTimer = (id: string, action: "pause" | "resume" | "restart" | "dismiss" | "extend") => update(current => ({
    ...current, timers: action === "dismiss" ? current.timers.filter(timer => timer.id !== id) : current.timers.map(timer => {
      if (timer.id !== id) return timer;
      const remaining = timerRemaining(timer);
      if (action === "extend") { const next = Math.min(86400, remaining + 60); return { ...timer, remaining: next, endsAt: timer.endsAt === null && remaining > 0 ? null : Date.now() + next * 1000 }; }
      return action === "pause" ? { ...timer, endsAt: null, remaining }
        : { ...timer, remaining: action === "restart" ? timer.duration : remaining,
          endsAt: Date.now() + (action === "restart" ? timer.duration : remaining) * 1000 };
    }),
  }));
  const deleteCurrent = async () => {
    const deletedOwner = owner;
    undoVersion.current[deletedOwner]++;
    setUndo(pending => pending?.owner === deletedOwner ? null : pending);
    return update(() => emptyFoodDocument());
  };
  const patchDocument = (patch: Partial<FoodDocument>) => update(current => ({ ...current, ...patch }));
  return { ...storage, doc, owner, discoveryScope, search, setSearch, searchSelection, setSearchSelection, discoveryQuery, setDiscoveryQuery, filters, setFilters, followDefault, radius, setRadius, cookSearch, setCookSearch, cookBrowse, setCookBrowse, savedSearch, setSavedSearch, savedSelection, setSavedSelection, isSaved, toggleSave, saveNote,
    undo: undo?.owner === owner ? undo.item : null, undoRemove, dismissUndo: () => setUndo(null),
    addCase, openPreview, leavePreview, pendingSignup, setPendingSignup, mergeCount, clearMerge: () => setMergeCount(0), mergeGuest,
    startTimer, changeTimer, patchDocument, update, commit, overCapacity, avatarLibrary,
    deleteCurrent, profileRoute, clearProfileRoute: () => setProfileRoute(null),
  };
}
const Context = createContext<ReturnType<typeof useFoodState> | null>(null);
export function FoodProvider({ children }: PropsWithChildren) {
  return <Context.Provider value={useFoodState()}>{children}</Context.Provider>;
}
export function useFood() {
  const value = useContext(Context);
  if (!value) throw new Error("FoodProvider is required");
  return value;
}
