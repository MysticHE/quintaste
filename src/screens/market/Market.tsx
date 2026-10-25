import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Screen } from "../../components/Screen";
import { EmptyState, IconButton, SearchField } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { TopBar, TopTabs } from "../../components/TopTabs";
import { View } from "react-native";
import { Button, T, common } from "../../components/ui";
import { goBack } from "../../utils/navigation";
import { useListingColumns } from "../../components/market/ListingGrid";
import { ListingCard as ListingTile } from "../../components/market/ListingCard";
import { ScreenList } from "../../components/ScreenList";
import { GridTileSkeleton, SkeletonList } from "../../components/Skeleton";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { OrdersContent } from "./Orders";
import { MyShopContent, useShopAdd, type ShopTab } from "./MyShop";
import { useDebounced } from "../../hooks/useDebounced";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { browse, browseKey, toggleSaved } from "../../services/market-api";
import { useLiveInbox } from "../../components/InboxCounts";
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
type MarketTab = "orders" | "shop";
const placeholders: Record<MarketTab, MarketKey> = { orders: "searchOrders", shop: "myItems" };
/**
 * Orders and My shop: a screen above the tabs, opened from Social, so Back returns to wherever it was opened from.
 * Browsing and events moved to Feeds and saved items to Social, so older /market links open their new home instead.
 */
export default function MarketScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  if (tab === "orders" || tab === "shop") return <MarketHub tab={tab} />;
  return <Redirect href={tab === "events" ? "/cook?tab=events" : tab === "saved" ? "/social?tab=saved" : "/cook?tab=market"} />;
}
function MarketHub({ tab }: { tab: MarketTab }) {
  const counts = useLiveInbox(), t = useT("market"), tc = useT("common");
  const [queries, setQueries] = useState<Record<MarketTab, string>>({ orders: "", shop: "" }), [shopTab, setShopTab] = useState<ShopTab>("orders");
  const query = queries[tab], setQuery = (value: string) => setQueries(current => ({ ...current, [tab]: value }));
  const add = useShopAdd(shopTab);
  return <Screen title={tc("tabMarket")} hideTimers floatingAction={tab === "shop" ? add : undefined} header={<View style={[common.row, { gap: 4 }]}>
    <IconButton appearance="plain" icon="chevron-back" label={tc("goBack")} onPress={() => goBack("/social")} />
    <T variant="subtitle" accessibilityRole="header" style={common.flex}>{tc("tabMarket")}</T>
    <IconButton appearance="plain" label={counts?.market ? t("inboxNew", { n: counts.market }) : t("inbox")} icon="chatbubbles-outline" badge={counts?.market ?? 0}
      onPress={() => router.push({ pathname: "/messages", params: { kind: "market" } })} />
  </View>}>
    {/* New orders are the seller's to act on, in My shop. */}
    <TopBar><TopTabs label={t("sections")} value={tab} onChange={next => router.setParams({ tab: next })}
      tabs={[{ id: "orders", label: t("tabOrders") }, { id: "shop", label: t("tabMyShop"), badge: counts?.orders ?? 0 }]} /></TopBar>
    <SearchField value={query} onChange={setQuery} placeholder={t(placeholders[tab])} />
    {tab === "orders" ? <OrdersContent query={query} /> : <MyShopContent tab={shopTab} setTab={setShopTab} query={query} />}
  </Screen>;
}
/** The listing grid in Feeds > Market; with savedOnly it lists the member's hearts. */
export function Browse({ query, filters, setFilters, clearQuery }: { query: string; filters: ShopFilter; setFilters: (filters: ShopFilter) => void; clearQuery?: () => void }) {
  const member = useMember(), { setNotice } = usePreferences(), t = useT("market"), tc = useT("common"), columns = useListingColumns();
  // Heart overrides bridge the refetch after a toggle; a newer first page from the server wins for its own items.
  const [saved, setSaved] = useState<Record<string, { value: boolean; base: unknown }>>({}), saving = useRef(new Set<string>());
  const key = browseKey(useDebounced(query), filters), remote = useRemote(key, signal => browse(key, signal), { keepPrevious: true }), more = useMore(key);
  const firstPage = new Set(remote.data?.items.map(item => item.id));
  const items = [...new Map([...(remote.data?.items ?? []), ...(more.extra?.items ?? [])].map(item => [item.id, item])).values()]
    .map(item => item.id in saved && (saved[item.id].base === remote.data || !firstPage.has(item.id)) ? { ...item, saved: saved[item.id].value } : item)
    .filter(item => !filters.savedOnly || item.saved);
  const next = more.extra ? more.extra.next : remote.data?.next ?? null;
  const count = marketFilterCount({ ...filters, savedOnly: false }), filtered = !!query.trim() || filters.category !== "All" || count > 0;
  const paused = remote.error?.code === "SERVICE_PAUSED";
  const clear = () => { setFilters({ ...defaultShopFilter(), savedOnly: false }); clearQuery?.(); };
  const save = async (item: ListingCard) => {
    if (!ensureMember(member, "/cook?tab=market") || saving.current.has(item.id)) return;
    saving.current.add(item.id);
    try { const result = await toggleSaved(item.id); setSaved(current => ({ ...current, [item.id]: { value: result.saved, base: remote.data } })); invalidate("/api/market/listings"); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("tryAgainSave"), error: true }); }
    finally { saving.current.delete(item.id); }
  };
  // A grid list: only the cards near the screen are drawn; a new search keeps the old cards, faded, until it loads.
  // A new column count (rotation, larger text) starts a fresh grid rather than reflowing the old one.
  return <ScreenList key={columns} data={paused || !remote.data ? [] : items} keyExtractor={item => item.id} numColumns={columns} columnGap={12} rowGap={20} dimmed={remote.stale}
    renderItem={({ item }) => <ListingTile listing={item} onSave={() => void save(item)} />}
    header={paused ? <FirstRunState icon="storefront-outline" title={t("opensSoon")} text={t("opensSoonText")} /> : <>
      <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/cook?tab=market"
        placeholder={<SkeletonList label={tc("loadingLabel")} count={columns * 2} columns={columns} shape={() => <GridTileSkeleton ratio={1} />} />} />
      {/* Empty states wait for this search's own results, never the faded ones from the last search. */}
      {remote.data && !remote.stale && !items.length && (filtered ? <EmptyState title={t("noMatchingFood")} text="" icon="search-outline" action={t("clearFilters")} onPress={clear} />
        : filters.savedOnly ? <FirstRunState icon="bookmark-outline" title={t("savedEmptyTitle")} text={t("savedEmptyText")} action={{ label: t("browseFood"), icon: "grid-outline", onPress: clear }} />
        : <FirstRunState icon="storefront-outline" title={t("emptyTitle")} text={t("emptyText")} action={{ label: t("sellOnMarket"), icon: "storefront-outline", onPress: () => router.push("/market?tab=shop") }} />)}
    </>}
    footer={!paused && next !== null ? <Button label={t("showMore")} variant="secondary" loading={more.busy} onPress={() => void more.load(next)} /> : null} />;
}
