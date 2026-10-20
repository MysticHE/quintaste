import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Screen } from "../../components/Screen";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseHeader, FirstRunState, IconTabs, type IconTab } from "../../components/BrowseControls";
import { Button, T } from "../../components/ui";
import { ListingGrid } from "../../components/market/ListingGrid";
import { MarketFilters } from "../../components/market/MarketFilters";
import { MemberPrompt, RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { OrdersContent } from "./Orders";
import { MyShopContent, useShopAdd, type ShopTab } from "./MyShop";
import { useDebounced } from "../../hooks/useDebounced";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { browse, browseKey, toggleSaved } from "../../services/market-api";
import { useMarketUnread } from "../../components/market/MarketUnread";
import { ApiError } from "../../services/community-api";
import { defaultShopFilter, type ListingCard, type ShopFilter } from "../../types/community";

const refined = (f: ShopFilter) => [f.category !== "All", f.labels.length > 0, f.practices.length > 0, f.exclude.length > 0, f.mode !== "Any", f.kind !== "Any", !!f.area.trim(), f.available, f.savedOnly, f.sort !== "Newest"].filter(Boolean).length;
/** Further pages of the current browse query; reset whenever the query changes. */
function useMore(key: string) {
  const { setNotice } = usePreferences();
  const [more, setMore] = useState<{ key: string; items: ListingCard[]; next: number | null }>(), [busy, setBusy] = useState(false);
  const extra = more?.key === key ? more : undefined;
  const load = async (cursor: number) => {
    setBusy(true);
    try {
      const page = await browse(key + "&cursor=" + cursor, new AbortController().signal);
      setMore({ key, items: [...(extra?.items ?? []), ...page.items], next: page.next });
    } catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "More items did not load. Try again.", error: true }); }
    finally { setBusy(false); }
  };
  return { extra, busy, load };
}
type MarketTab = "browse" | "saved" | "orders" | "shop";
const placeholders: Record<MarketTab, string> = { browse: "Search Market", saved: "Search saved", orders: "Search orders", shop: "My items" };
/** Market: browse, saved items, orders and the member's shop as tabs under one search box. */
export default function MarketScreen() {
  const { tab: param } = useLocalSearchParams<{ tab?: string }>();
  const tab: MarketTab = param === "saved" || param === "orders" || param === "shop" ? param : "browse";
  const member = useMember(), counts = useMarketUnread();
  const [queries, setQueries] = useState<Record<MarketTab, string>>({ browse: "", saved: "", orders: "", shop: "" });
  const [filters, setFilters] = useState(defaultShopFilter), [filterOpen, setFilterOpen] = useState(false), [shopTab, setShopTab] = useState<ShopTab>("orders");
  const query = queries[tab], setQuery = (value: string) => setQueries(current => ({ ...current, [tab]: value }));
  const add = useShopAdd(shopTab), browsing = tab === "browse" || tab === "saved";
  const tabs: IconTab<MarketTab>[] = [
    { id: "browse", label: "Browse", icon: "grid-outline", activeIcon: "grid" },
    { id: "saved", label: "Saved", icon: "bookmark-outline", activeIcon: "bookmark" },
    { id: "orders", label: "Orders", icon: "receipt-outline", activeIcon: "receipt" },
    // New orders are the seller's to act on, in My shop.
    { id: "shop", label: "My shop", icon: "storefront-outline", activeIcon: "storefront", badge: counts?.orders ?? 0 },
  ];
  return <Screen title="Market" back={false} hideTimers floatingAction={tab === "shop" ? add : undefined}
    header={<BrowseHeader query={query} onChange={setQuery} placeholder={placeholders[tab]}
      filter={browsing ? { label: "Market filters", count: refined({ ...filters, savedOnly: false }), onPress: () => setFilterOpen(true) } : undefined}
      action={<IconButton label={counts?.count ? `Market Inbox, ${counts.count} new` : "Market Inbox"} icon="chatbubbles-outline" badge={counts?.count ?? 0} onPress={() => router.push("/market/inbox")} />} />}>
    <IconTabs tabs={tabs} value={tab} label="Market sections" onChange={next => router.setParams({ tab: next === "browse" ? undefined : next })} />
    {browsing ? (tab === "saved" && !member.member ? <MemberPrompt icon="bookmark-outline" returnTo="/market?tab=saved" />
      : <Browse query={query} filters={{ ...filters, savedOnly: tab === "saved" }} setFilters={setFilters} />)
      : tab === "orders" ? <OrdersContent query={query} /> : <MyShopContent tab={shopTab} setTab={setShopTab} query={query} />}
    {filterOpen && <MarketFilters value={{ ...filters, savedOnly: tab === "saved" }} onApply={next => setFilters({ ...next, savedOnly: false })} onClose={() => setFilterOpen(false)} />}
  </Screen>;
}
/** The listing grid for Browse and Saved; Saved is Browse limited to the member's hearts. */
function Browse({ query, filters, setFilters }: { query: string; filters: ShopFilter; setFilters: (filters: ShopFilter) => void }) {
  const member = useMember(), { setNotice } = usePreferences();
  // Heart overrides bridge the refetch after a toggle; a newer first page from the server wins for its own items.
  const [saved, setSaved] = useState<Record<string, { value: boolean; base: unknown }>>({}), saving = useRef(new Set<string>());
  const key = browseKey(useDebounced(query), filters), remote = useRemote(key, signal => browse(key, signal)), more = useMore(key);
  const firstPage = new Set(remote.data?.items.map(item => item.id));
  const items = [...new Map([...(remote.data?.items ?? []), ...(more.extra?.items ?? [])].map(item => [item.id, item])).values()]
    .map(item => item.id in saved && (saved[item.id].base === remote.data || !firstPage.has(item.id)) ? { ...item, saved: saved[item.id].value } : item)
    .filter(item => !filters.savedOnly || item.saved);
  const next = more.extra ? more.extra.next : remote.data?.next ?? null;
  const count = refined({ ...filters, savedOnly: false }), filtered = !!query.trim() || filters.category !== "All" || count > 0;
  const paused = remote.error?.code === "SERVICE_PAUSED";
  const clear = () => setFilters({ ...defaultShopFilter(), savedOnly: false });
  const save = async (item: ListingCard) => {
    if (!ensureMember(member, "/market") || saving.current.has(item.id)) return;
    saving.current.add(item.id);
    try { const result = await toggleSaved(item.id); setSaved(current => ({ ...current, [item.id]: { value: result.saved, base: remote.data } })); invalidate("/api/market/listings"); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "That did not save. Try again.", error: true }); }
    finally { saving.current.delete(item.id); }
  };
  if (paused) return <FirstRunState icon="storefront-outline" title="Market opens soon" text="Buy home-cooked food and sealed packs from people nearby." />;
  return <>
    {filtered && remote.data && <T variant="small" muted accessibilityLiveRegion="polite">{items.length}{next !== null ? "+" : ""} {items.length === 1 ? "item" : "items"}</T>}
    <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market" />
    {remote.data && (items.length ? <ListingGrid items={items} onSave={item => void save(item)} />
      : filtered ? <EmptyState title="No Matching Food" text="" icon="search-outline" action="Clear Filters" onPress={clear} />
      : filters.savedOnly ? <FirstRunState icon="bookmark-outline" title="Save food you like" text="Tap the bookmark on any item to keep it here." action={{ label: "Browse Food", icon: "grid-outline", onPress: () => router.setParams({ tab: undefined }) }} />
      : <FirstRunState icon="storefront-outline" title="Nothing on sale yet" text="Home cooks will list food here. Cook something good? You can sell it too." action={{ label: "Sell On Market", icon: "storefront-outline", onPress: () => router.setParams({ tab: "shop" }) }} />)}
    {next !== null && <Button label="Show More" variant="secondary" loading={more.busy} onPress={() => void more.load(next)} />}
  </>;
}
