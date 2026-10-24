import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useFood } from "./Food";
import { defaultShopFilter, type ShopFilter } from "../types/community";
import type { SearchPoint } from "../types/location-search";

export type FeedTab = "recipes" | "events" | "market";
export type DateChoice = "any" | "today" | "weekend" | "date";
/** Where Near me found the member: the point for distance to events, the planning area for cooking classes. */
export type NearPoint = SearchPoint & { area: string };
export type EventFilters = { kind: "all" | "local" | "classes"; when: DateChoice; date: string; area: string; near: NearPoint | null; price: "any" | "free" | "paid"; savedOnly: boolean };
export const defaultEventFilters = (): EventFilters => ({ kind: "all", when: "any", date: "", area: "", near: null, price: "any", savedOnly: false });
function useFeedState() {
  const { discoveryScope } = useFood(), key = "@quintaste/saved-feed-events/" + discoveryScope;
  const [queries, setQueries] = useState({ events: "", market: "" });
  const [events, setEvents] = useState(defaultEventFilters);
  const [market, setMarket] = useState<ShopFilter>(defaultShopFilter);
  const [savedEvents, setSavedEvents] = useState<string[]>([]), [savesReady, setSavesReady] = useState(false);
  const saved = useRef<string[]>([]), queue = useRef(Promise.resolve()), live = useRef(true);
  useEffect(() => {
    live.current = true;
    queue.current = AsyncStorage.getItem(key).then(raw => {
      const data: unknown = raw ? JSON.parse(raw) : [];
      saved.current = Array.isArray(data) ? data.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
      if (live.current) { setSavedEvents(saved.current); setSavesReady(true); }
    }).catch(() => { if (live.current) setSavesReady(true); });
    return () => { live.current = false; };
  }, [key]);
  const toggleEvent = (id: string) => {
    const task = queue.current.then(async () => {
      const next = saved.current.includes(id) ? saved.current.filter(item => item !== id) : [id, ...saved.current].slice(0, 200);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      saved.current = next;
      if (live.current) setSavedEvents(next);
    });
    queue.current = task.catch(() => {});
    return task;
  };
  return { queries, setQueries, events, setEvents, market, setMarket, savedEvents, savesReady, toggleEvent };
}
const Context = createContext<ReturnType<typeof useFeedState> | null>(null);
function ScopedFeeds({ children }: PropsWithChildren) { return <Context.Provider value={useFeedState()}>{children}</Context.Provider>; }
/** Search pages sit outside the tab navigator; account changes discard all transient queries and filters. */
export function FeedsProvider({ children }: PropsWithChildren) {
  const { discoveryScope } = useFood();
  return <ScopedFeeds key={discoveryScope}>{children}</ScopedFeeds>;
}
export function useFeeds() {
  const value = useContext(Context);
  if (!value) throw new Error("FeedsProvider is required");
  return value;
}
