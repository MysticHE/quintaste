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
import { EventsList } from "../../components/market/EventsList";
import { useDebounced } from "../../hooks/useDebounced";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { browse, browseKey, toggleSaved } from "../../services/market-api";
import { useMarketUnread } from "../../components/market/MarketUnread";
import { ApiError } from "../../services/community-api";
import { useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import { defaultShopFilter, type ListingCard, type ShopFilter } from "../../types/community";

export const marketFilterCount = (f: ShopFilter) => [f.category !== "All", f.labels.length > 0, f.practices.length > 0, f.exclude.length > 0, f.mode !== "Any", f.kind !== "Any", !!f.area.trim(), f.available, f.savedOnly, f.sort !== "Newest",
  !!f.price && f.price !== "any", !!f.collection && f.collection !== "any"].filter(Boolean).length;
/** Further pages of the current browse query; reset whenever the query changes. */
function useMore(key: string) {
  const { setNotice } = usePreferences(), t = useT("market");
  const [more, setMore] = useState<{ key: string; items: ListingCard[]; next: number | null }>(), [busy, setBusy] = useState(false);
  const extra = more?.key === key ? more : undefined;
  const load = async (cursor: number) => {
    setBusy(true);
    try {
      const page = await browse(key + "&cursor=" + cursor, new AbortController().signal);
      setMore({ key, items: [...(extra?.items ?? []), ...page.items], next: page.next });
    } catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("moreFailed"), error: true }); }
    finally { setBusy(false); }
  };
  return { extra, busy, load };
}
type MarketTab = "browse" | "events" | "saved" | "orders" | "shop";
const placeholders: Record<MarketTab, MarketKey> = { browse: "searchMarket", events: "findEvents", saved: "searchSaved", orders: "searchOrders", shop: "myItems" };
/** Market: browse, events and cooking classes, saved items, orders and the member's shop as tabs under one search box. */
export default function MarketScreen() {
  const { tab: param } = useLocalSearchParams<{ tab?: string }>();
  const tab: MarketTab = param === "events" || param === "saved" || param === "orders" || param === "shop" ? param : "browse";
  const member = useMember(), counts = useMarketUnread(), t = useT("market"), tc = useT("common");
  const [queries, setQueries] = useState<Record<MarketTab, string>>({ browse: "", events: "", saved: "", orders: "", shop: "" });
  const [filters, setFilters] = useState(defaultShopFilter), [filterOpen, setFilterOpen] = useState(false), [shopTab, setShopTab] = useState<ShopTab>("orders");
  const query = queries[tab], setQuery = (value: string) => setQueries(current => ({ ...current, [tab]: value }));
  const add = useShopAdd(shopTab), browsing = tab === "browse" || tab === "saved";
  const tabs: IconTab<MarketTab>[] = [
    { id: "browse", label: t("tabBrowse"), icon: "grid-outline", activeIcon: "grid" },
    // Local events and cooking classes by approved teachers, open to every member (24 Oct 2026: moved here from Social).
    { id: "events", label: t("tabEvents"), icon: "calendar-outline", activeIcon: "calendar" },
    { id: "saved", label: tc("saved"), icon: "bookmark-outline", activeIcon: "bookmark" },
    { id: "orders", label: t("tabOrders"), icon: "receipt-outline", activeIcon: "receipt" },
    // New orders are the seller's to act on, in My shop.
    { id: "shop", label: t("tabMyShop"), icon: "storefront-outline", activeIcon: "storefront", badge: counts?.orders ?? 0 },
  ];
  return <Screen title={tc("tabMarket")} back={false} hideTimers floatingAction={tab === "shop" ? add : undefined}
    header={<BrowseHeader query={query} onChange={setQuery} placeholder={t(placeholders[tab])}
      filter={browsing ? { label: t("marketFilters"), count: marketFilterCount({ ...filters, savedOnly: false }), onPress: () => setFilterOpen(true) } : undefined}
      action={<IconButton label={counts?.count ? t("inboxNew", { n: counts.count }) : t("inbox")} icon="chatbubbles-outline" badge={counts?.count ?? 0} onPress={() => router.push("/market/inbox")} />} />}>
    <IconTabs tabs={tabs} value={tab} label={t("sections")} onChange={next => router.setParams({ tab: next === "browse" ? undefined : next })} />
    {browsing ? (tab === "saved" && !member.member ? <MemberPrompt icon="bookmark-outline" returnTo="/market?tab=saved" />
      : <Browse query={query} filters={{ ...filters, savedOnly: tab === "saved" }} setFilters={setFilters} />)
      : tab === "events" ? <EventsList query={query} /> : tab === "orders" ? <OrdersContent query={query} /> : <MyShopContent tab={shopTab} setTab={setShopTab} query={query} />}
    {filterOpen && <MarketFilters value={{ ...filters, savedOnly: tab === "saved" }} onApply={next => setFilters({ ...next, savedOnly: false })} onClose={() => setFilterOpen(false)} />}
  </Screen>;
}
/** The listing grid for Browse and Saved; Saved is Browse limited to the member's hearts. */
export function Browse({ query, filters, setFilters, feed = false, clearQuery }: { query: string; filters: ShopFilter; setFilters: (filters: ShopFilter) => void; feed?: boolean; clearQuery?: () => void }) {
  const member = useMember(), { setNotice } = usePreferences(), t = useT("market");
  // Heart overrides bridge the refetch after a toggle; a newer first page from the server wins for its own items.
  const [saved, setSaved] = useState<Record<string, { value: boolean; base: unknown }>>({}), saving = useRef(new Set<string>());
  const key = browseKey(useDebounced(query), filters), remote = useRemote(key, signal => browse(key, signal)), more = useMore(key);
  const firstPage = new Set(remote.data?.items.map(item => item.id));
  const items = [...new Map([...(remote.data?.items ?? []), ...(more.extra?.items ?? [])].map(item => [item.id, item])).values()]
    .map(item => item.id in saved && (saved[item.id].base === remote.data || !firstPage.has(item.id)) ? { ...item, saved: saved[item.id].value } : item)
    .filter(item => !filters.savedOnly || item.saved);
  const next = more.extra ? more.extra.next : remote.data?.next ?? null;
  const count = marketFilterCount({ ...filters, savedOnly: false }), filtered = !!query.trim() || filters.category !== "All" || count > 0;
  const paused = remote.error?.code === "SERVICE_PAUSED";
  const clear = () => { setFilters({ ...defaultShopFilter(), savedOnly: false }); clearQuery?.(); };
  const save = async (item: ListingCard) => {
    if (!ensureMember(member, "/market") || saving.current.has(item.id)) return;
    saving.current.add(item.id);
    try { const result = await toggleSaved(item.id); setSaved(current => ({ ...current, [item.id]: { value: result.saved, base: remote.data } })); invalidate("/api/market/listings"); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("tryAgainSave"), error: true }); }
    finally { saving.current.delete(item.id); }
  };
  if (paused) return <FirstRunState icon="storefront-outline" title={t("opensSoon")} text={t("opensSoonText")} />;
  return <>
    {!feed && filtered && remote.data && <T variant="small" muted accessibilityLiveRegion="polite">{t("itemCount", { n: items.length, plus: next !== null ? "+" : "" })}</T>}
    <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market" />
    {remote.data && (items.length ? <ListingGrid items={items} onSave={item => void save(item)} />
      : filtered ? <EmptyState title={t("noMatchingFood")} text="" icon="search-outline" action={t("clearFilters")} onPress={clear} />
      : filters.savedOnly ? <FirstRunState icon="bookmark-outline" title={t("savedEmptyTitle")} text={t("savedEmptyText")} action={{ label: t("browseFood"), icon: "grid-outline", onPress: () => feed ? clear() : router.setParams({ tab: undefined }) }} />
      : <FirstRunState icon="storefront-outline" title={t("emptyTitle")} text={t("emptyText")} action={{ label: t("sellOnMarket"), icon: "storefront-outline", onPress: () => feed ? router.push("/market?tab=shop") : router.setParams({ tab: "shop" }) }} />)}
    {next !== null && <Button label={t("showMore")} variant="secondary" loading={more.busy} onPress={() => void more.load(next)} />}
  </>;
}
