import { router } from "expo-router";
import { useRef, useState } from "react";
import { Screen } from "../../components/Screen";
import { Chip, EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseActions, BrowseHeader } from "../../components/BrowseControls";
import { Button, T } from "../../components/ui";
import { ListingGrid } from "../../components/market/ListingGrid";
import { MarketFilters } from "../../components/market/MarketFilters";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { browse, browseKey, toggleSaved, unread } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { defaultShopFilter, type ListingCard, type ShopFilter } from "../../types/community";

const refined = (f: ShopFilter) => [f.category !== "All", f.diets.length > 0, f.exclude.length > 0, f.mode !== "Any", f.kind !== "Any", !!f.area.trim(), f.available, f.savedOnly, f.sort !== "Newest"].filter(Boolean).length;
export function MarketHeader({ query, setQuery, placeholder = "Search food and shops" }: { query: string; setQuery: (value: string) => void; placeholder?: string }) {
  const { member } = useMember(), count = useRemote(member ? "/api/market/unread" : null, unread, 30000).data?.count ?? 0;
  return <BrowseHeader query={query} onChange={setQuery} placeholder={placeholder}
    action={<IconButton label={count ? `Market Inbox, ${count} new` : "Market Inbox"} icon="chatbubbles-outline" badge={count} onPress={() => router.push("/market/inbox")} />} />;
}
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
/** Browse home-cooked food and sealed packs: categories, compact controls and the grid. */
export default function MarketScreen() {
  const member = useMember(), { setNotice } = usePreferences();
  const [query, setQuery] = useState(""), [filters, setFilters] = useState(defaultShopFilter), [filterOpen, setFilterOpen] = useState(false);
  // Heart overrides bridge the refetch after a toggle; a newer first page from the server wins for its own items.
  const [saved, setSaved] = useState<Record<string, { value: boolean; base: unknown }>>({}), saving = useRef(new Set<string>());
  const key = browseKey(useDebounced(query), filters), remote = useRemote(key, signal => browse(key, signal)), more = useMore(key);
  const firstPage = new Set(remote.data?.items.map(item => item.id));
  const items = [...new Map([...(remote.data?.items ?? []), ...(more.extra?.items ?? [])].map(item => [item.id, item])).values()]
    .map(item => item.id in saved && (saved[item.id].base === remote.data || !firstPage.has(item.id)) ? { ...item, saved: saved[item.id].value } : item);
  const next = more.extra ? more.extra.next : remote.data?.next ?? null;
  const count = refined(filters), filtered = !!query.trim() || filters.category !== "All" || filters.savedOnly || count > 0;
  const paused = remote.error?.code === "SERVICE_PAUSED";
  const clear = () => { setFilters(defaultShopFilter()); setQuery(""); };
  const save = async (item: ListingCard) => {
    if (!ensureMember(member, "/market") || saving.current.has(item.id)) return;
    saving.current.add(item.id);
    try { const result = await toggleSaved(item.id); setSaved(current => ({ ...current, [item.id]: { value: result.saved, base: remote.data } })); invalidate("/api/market/listings"); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "That did not save. Try again.", error: true }); }
    finally { saving.current.delete(item.id); }
  };
  return <Screen title="Market" back={false} hideTimers contentStyle={{ paddingHorizontal: 12 }} header={<MarketHeader query={query} setQuery={setQuery} />}>
    {paused ? <EmptyState title="Coming Soon" text="" icon="storefront-outline" primary={{ label: "Sell On QuinTaste", onPress: () => router.push("/market/my-shop") }} /> : <>
      <BrowseActions trailing={<IconButton label={count ? "Market filters, " + count + " active" : "Market filters"} icon="options-outline" badge={count} selected={count > 0} onPress={() => setFilterOpen(true)} />}>
        <Chip compact label="Orders" icon="receipt-outline" onPress={() => { if (ensureMember(member, "/market")) router.push("/market/orders"); }} />
        <Chip compact label="My Shop" icon="storefront-outline" onPress={() => router.push("/market/my-shop")} />
      </BrowseActions>
      {filtered && remote.data && <T variant="small" muted accessibilityLiveRegion="polite">{items.length}{next !== null ? "+" : ""} {items.length === 1 ? "item" : "items"}</T>}
      <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market" />
      {remote.data && (items.length ? <ListingGrid items={items} onSave={item => void save(item)} />
        : filtered ? <EmptyState title={filters.savedOnly && !query && count === 1 ? "No Saved Items" : "No Matching Food"} text="" icon="search-outline" action="Clear Filters" onPress={clear} />
        : <EmptyState title="No Shops Yet" text="" icon="storefront-outline" primary={{ label: "Sell On QuinTaste", onPress: () => router.push("/market/my-shop") }} />)}
      {next !== null && <Button label="Show More" variant="secondary" loading={more.busy} onPress={() => void more.load(next)} />}
    </>}
    {filterOpen && <MarketFilters value={filters} onApply={next => { if (!next.savedOnly || ensureMember(member, "/market")) setFilters(next); }} onClose={() => setFilterOpen(false)} />}
  </Screen>;
}
