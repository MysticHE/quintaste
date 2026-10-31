import { Image, type ImageSource } from "expo-image";
import { router, type Href } from "expo-router";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "../ui";
import { EmptyState, IconButton } from "../food/Controls";
import { RemoteStatus } from "../CommunityGate";
import { GridTileSkeleton, LoadingShapes, SkeletonList } from "../Skeleton";
import { useListingSource } from "../market/ListingPhoto";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { useFeeds } from "../../state/Feeds";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { useDebounced } from "../../hooks/useDebounced";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useReactions } from "../../hooks/useReactions";
import { browse, browseKey, ownListings, sellerState, toggleSaved } from "../../services/market-api";
import { cookingClass, teaching } from "../../services/classes-api";
import { communityRequest } from "../../services/community-api";
import type { ExternalEvent } from "../../services/editorial";
import { defaultShopFilter, type PersonPosts } from "../../types/community";
import { photos } from "../../data/photos";
import { ReactionBar } from "../ReactionBar";
import { recipeShareMessage } from "../../utils/recipe-share";
import { recipeStatus } from "../../services/member-recipes";
import { marketMoney } from "../../utils/market";
import { formatSgShort } from "../../utils/sg-datetime";
import { useLanguage, useT } from "../../i18n";

export type ContentKind = "all" | "places" | "recipes" | "market" | "events";
export function GridTile({ title, type, path, source, thumbhash, note, href, onPress, save, children, date, icon = "image-outline" }: {
  title: string; type: string; path?: string | null; source?: ImageSource | number; thumbhash?: string; note?: string; href?: Href; onPress?: () => void; icon?: IconName;
  save?: () => Promise<unknown>; children?: ReactNode; date?: string;
}) {
  const { theme, setNotice } = usePreferences(), image = useListingSource(), t = useT("profile"), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const imageSource = source ?? image(path);
  return <View style={{ width: "48%", flexGrow: 0, gap: 4, marginBottom: 12 }}>
    <View><Pressable accessibilityRole="button" accessibilityLabel={[title, type, note].filter(Boolean).join(", ")} onPress={onPress ?? (() => href && router.push(href))}>
      <View style={{ aspectRatio: 1.12, borderRadius: 12, overflow: "hidden", backgroundColor: imageSource && !failed ? theme.muted : theme.accentSoft, alignItems: "center", justifyContent: "center", gap: 8 }}>
        {imageSource && !failed ? <Image source={imageSource} placeholder={thumbhash ? { thumbhash } : undefined} placeholderContentFit="cover" contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
          : <><Icon name={date ? "calendar-outline" : icon} size={34} color={theme.accent} />{!!date && <T variant="small" style={{ textAlign: "center", paddingHorizontal: 8 }}>{date}</T>}</>}
        <View style={{ position: "absolute", bottom: 8, left: 8, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.card }}><T variant="caption">{type}</T></View>
      </View><T numberOfLines={2} style={[common.bold, { paddingTop: 6 }]}>{title}</T>
      {!!note && <T variant="small" muted numberOfLines={2}>{note}</T>}
    </Pressable>{save && <View style={{ position: "absolute", right: 4, top: 4, borderRadius: 10, backgroundColor: theme.card }}>
      <IconButton icon="bookmark" label={t("remove") + ": " + title} selected disabled={busy} onPress={() => {
        if (busy) return; setBusy(true); void save().catch(() => setNotice({ text: t("savedFailed"), error: true })).finally(() => setBusy(false));
      }} /></View>}</View>{children}
  </View>;
}
/** A tile still loading, the same size as the tile that replaces it. */
function TileLoading() {
  const t = useT("common");
  return <View style={{ width: "48%" }}><LoadingShapes label={t("loadingLabel")}><GridTileSkeleton /></LoadingShapes></View>;
}
/** The tile's footprint for an item that could not load. */
function UnavailableTile({ retry, remove }: { retry?: () => void; remove?: () => void }) {
  const { theme } = usePreferences(), t = useT("profile");
  return <View style={{ width: "48%", marginBottom: 12 }}>
    <View style={{ aspectRatio: 1.12, borderRadius: 12, backgroundColor: theme.muted, alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Icon name="cloud-offline-outline" size={28} color={theme.mutedForeground} />
      <T variant="small" muted>{t("unavailable")}</T>
      <View style={[common.row, { gap: 4 }]}>
        {retry && <IconButton appearance="plain" icon="refresh" label={t("retry")} onPress={retry} />}
        {remove && <IconButton appearance="plain" icon="trash-outline" label={t("remove")} onPress={remove} />}
      </View>
    </View>
  </View>;
}
type ResultReporter = (id: string, count: number) => void;
function RecipeTile({ id, query = "", saved = false, report, onGone }: { id: string; query?: string; saved?: boolean; report?: ResultReporter; onGone?: (id: string) => void }) {
  const { recipe, loading, error, refresh, gone } = usePublishedRecipe(id), t = useT("profile"), language = useLanguage(), food = useFood();
  useReactions("recipe", recipe ? [id] : []);
  const count = recipe ? (!query || recipe.name.toLowerCase().includes(query) ? 1 : 0) : gone ? 0 : loading ? -2 : -1;
  useEffect(() => { report?.("r:" + id, count); }, [report, id, count]);
  useEffect(() => { if (gone) onGone?.(id); }, [gone, onGone, id]);
  // Deleted or hidden by staff: the tile leaves the profile (Saved offers to remove such saves together).
  if (!recipe && gone) return null;
  if (loading && !recipe) return <TileLoading />;
  if (!recipe) return <UnavailableTile retry={error && !gone ? refresh : undefined} remove={saved ? () => void food.toggleSave("recipe", id) : undefined} />;
  if (query && !recipe.name.toLowerCase().includes(query)) return null;
  return <GridTile title={recipe.name} type={t("recipe")} path={recipe.image?.path} source={!recipe.image?.path && recipe.photo ? photos[recipe.photo] as ImageSource : undefined}
    href={("/cook/recipe/" + id) as Href} save={saved ? () => food.toggleSave("recipe", id) : undefined}>
    <ReactionBar kind="recipe" id={id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe, language)} />
  </GridTile>;
}
/** What others can see: live recipes, items on sale and posted classes (drafts and paused items are not counted). Null until something loads. */
export function usePostCount() {
  const status = useMyRecipeStatus(), seller = useRemote("/api/market/seller", sellerState);
  const items = useRemote(seller.data?.seller ? "/api/market/seller/listings" : null, ownListings), classes = useRemote("/api/market/teaching", teaching);
  if (!status.data && !items.data && !classes.data) return null;
  return (status.data?.items ?? []).filter(r => r.live && !r.hidden).length + (items.data?.items ?? []).filter(l => l.status === "active").length
    + (classes.data?.classes ?? []).filter(c => c.status === "posted").length;
}
export function MyPostGrid({ kind }: { kind: ContentKind }) {
  const { workspace, ready } = useRecipeWorkspace(), status = useMyRecipeStatus(), t = useT("profile"), tm = useT("market"), language = useLanguage();
  const seller = useRemote(kind === "all" || kind === "market" ? "/api/market/seller" : null, sellerState);
  const items = useRemote(seller.data?.seller && (kind === "all" || kind === "market") ? "/api/market/seller/listings" : null, ownListings);
  const classes = useRemote(kind === "all" || kind === "events" ? "/api/market/teaching" : null, teaching);
  const recipes = kind === "all" || kind === "recipes", market = kind === "all" || kind === "market", events = kind === "all" || kind === "events";
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  const markGone = useCallback((id: string) => { setGone(current => (current.has(id) ? current : new Set([...current, id]))); }, []);
  const drafts = recipes ? workspace.drafts : [], remoteOnly = recipes ? (status.data?.items ?? []).filter(r => r.live && !r.hidden && !gone.has(r.id) && !workspace.drafts.some(d => d.id === r.draftKey)) : [];
  const listings = market ? items.data?.items ?? [] : [], hosted = events ? classes.data?.classes ?? [] : [];
  const busy = !ready || (recipes && status.loading) || (market && (seller.loading || items.loading)) || (events && classes.loading);
  // The first load draws tile shapes in place of the grid; each source's own spinner stays off.
  const t0 = useT("common"), firstLoad = !ready || [recipes && status, market && seller, market && items, events && classes]
    .some(remote => remote && remote.loading && remote.data === undefined && !remote.error);
  const error = (recipes && status.error) || (market && (seller.error || items.error)) || (events && classes.error);
  useReactions("recipe", drafts.map(d => status.byDraft.get(d.id)).filter(r => r?.live && !r.hidden).map(r => r!.id));
  return <>
    {recipes && <RemoteStatus remote={status} icon="book-outline" returnTo="/social" placeholder={null} />}
    {market && <><RemoteStatus remote={seller} icon="storefront-outline" returnTo="/social" placeholder={null} /><RemoteStatus remote={items} icon="storefront-outline" returnTo="/social" placeholder={null} /></>}
    {events && <RemoteStatus remote={classes} icon="calendar-outline" returnTo="/social" placeholder={null} />}
    {firstLoad && !drafts.length && <SkeletonList label={t0("loadingLabel")} count={4} columns={2} shape={() => <GridTileSkeleton />} />}
    {!busy && !error && !drafts.length && !remoteOnly.length && !listings.length && !hosted.length && <EmptyState title={t("noPosts")} text={t("noPostsText")} icon="grid-outline" />}
    <View testID="profile-post-grid" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
      {drafts.map(d => { const live = status.byDraft.get(d.id); return <GridTile key={d.id} title={d.title || t("untitled")} type={t("recipe")} path={d.photo} icon="restaurant-outline"
        note={recipeStatus(d, live, language)} href={("/recipe-draft/" + d.id) as Href}>
        {live?.live && !live.hidden && <ReactionBar kind="recipe" id={live.id} name={d.title} shareMessage={() => d.title + " " + Linking.createURL("/cook/recipe/" + live.id)} />}
      </GridTile>; })}
      {remoteOnly.map(r => <RecipeTile key={r.id} id={r.id} onGone={markGone} />)}
      {listings.map(l => <GridTile key={l.id} title={l.name} type={t("market")} path={l.photos.item} icon="storefront-outline" note={marketMoney(l.priceCents) + " · " + tm(({ active: "itemLive", draft: "itemDraft", paused: "itemPaused", removed: "itemRemoved" } as const)[l.status])} href={{ pathname: "/market/edit", params: { id: l.id } }} />)}
      {hosted.map(c => <GridTile key={c.id} title={c.title} type={t("event")} date={formatSgShort(c.starts, language)} note={c.status === "draft" ? t("draft") : c.status === "cancelled" ? tm("classStatusCancelled") : formatSgShort(c.starts, language)}
        href={("/market/class/" + c.id) as Href} />)}
    </View>
  </>;
}
/**
 * Another member's posts (their profile's grid), drawn from the summaries their profile request carries, so no tile loads on
 * its own: live recipes with likes and shares, items on sale and classes (the date sits on the class tile).
 */
export function PersonPostGrid({ posts, kind }: { posts: PersonPosts; kind: ContentKind }) {
  const t = useT("profile"), language = useLanguage();
  const recipes = kind === "all" || kind === "recipes" ? posts.recipes : [];
  const items = kind === "all" || kind === "market" ? posts.items : [], hosted = kind === "all" || kind === "events" ? posts.classes : [];
  useReactions("recipe", recipes.map(r => r.id));
  return <View testID="person-post-grid" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
    {recipes.map(r => <GridTile key={r.id} title={r.name} type={t("recipe")} path={r.image} icon="restaurant-outline" href={("/cook/recipe/" + r.id) as Href}>
      <ReactionBar kind="recipe" id={r.id} name={r.name} shareMessage={() => r.name + " " + Linking.createURL("/cook/recipe/" + r.id)} />
    </GridTile>)}
    {items.map(l => <GridTile key={l.id} title={l.name} type={t("market")} path={l.photo} icon="storefront-outline" note={marketMoney(l.priceCents)} href={("/market/listing/" + l.id) as Href} />)}
    {hosted.map(c => <GridTile key={c.id} title={c.title} type={t("event")} date={formatSgShort(c.starts, language)} href={("/market/class/" + c.id) as Href} />)}
  </View>;
}
export function SavedGrid({ kind, query }: { kind: ContentKind; query: string }) {
  const { doc, update } = useFood(), { setNotice } = usePreferences(), feeds = useFeeds(), t = useT("profile"), q = useDebounced(query).trim().toLowerCase(), [limit, setLimit] = useState(6);
  // Saved recipes staff deleted or hid leave the grid (so pages fill with the rest) and are offered for removal together.
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set()), [clearing, setClearing] = useState(false);
  const markGone = useCallback((id: string) => { setGone(current => (current.has(id) ? current : new Set([...current, id]))); }, []);
  const newest = (type: "recipe" | "place") => doc.saves.filter(s => s.kind === type).sort((a, b) => b.savedAt - a.savedAt).map(s => s.id);
  const ids = newest("recipe").filter(id => !id.startsWith("private-") && !gone.has(id));
  const goneSaved = [...gone].filter(id => doc.saves.some(s => s.kind === "recipe" && s.id === id));
  const removeGone = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      const removed = new Set(goneSaved);
      if (await update(current => ({ ...current, saves: current.saves.filter(s => s.kind !== "recipe" || !removed.has(s.id)) }))) setGone(new Set());
      else setNotice({ text: t("savedFailed"), error: true });
    } catch { setNotice({ text: t("savedFailed"), error: true }); }
    finally { setClearing(false); }
  };
  // Only Explore catalogue places have a tile; older saves (Google places, sample venues) stay in Saved places.
  const placeIds = newest("place").filter(id => id.startsWith("catalogue-")).map(id => id.slice(10));
  const places = kind === "all" || kind === "places", recipes = kind === "all" || kind === "recipes", market = kind === "all" || kind === "market", events = kind === "all" || kind === "events";
  const [results, setResults] = useState<Record<string, number>>({});
  const report = useCallback((id: string, count: number) => setResults(current => current[q + ":" + id] === count ? current : { ...current, [q + ":" + id]: count }), [q]);
  const remaining = (places && placeIds.length > limit) || (recipes && ids.length > limit) || (events && feeds.savedEvents.length > limit);
  const keys = [...(places ? placeIds.slice(0, limit).map(id => "p:" + id) : []), ...(recipes ? ids.slice(0, limit).map(id => "r:" + id) : []),
    ...(market ? ["market"] : []), ...(events ? feeds.savedEvents.slice(0, limit) : [])];
  const empty = feeds.savesReady && !remaining && keys.every(id => results[q + ":" + id] === 0);
  const settled = keys.every(id => results[q + ":" + id] !== undefined && results[q + ":" + id] >= -1);
  const total = Math.max(places ? placeIds.length : 0, recipes ? ids.length : 0, events ? feeds.savedEvents.length : 0);
  // Search resolves the entire collection in small batches, including past an
  // unavailable saved record. Pagination only limits idle browsing.
  useEffect(() => {
    if (!q || !remaining || !settled) return;
    // Yield between result batches so typing/navigation can interrupt the scan.
    const next = setTimeout(() => setLimit(current => Math.min(total, current + 6)), 0);
    return () => clearTimeout(next);
  }, [q, remaining, settled, total]);
  return <>
    {recipes && !!goneSaved.length && <View style={[common.row, { gap: 8, marginBottom: 8 }]}>
      <T variant="small" muted style={common.flex}>{t("goneSaved", { n: goneSaved.length })}</T>
      <Button label={t("removeGone")} variant="link" disabled={clearing} onPress={() => void removeGone()} />
    </View>}
    <View testID="profile-saved-grid" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
      {places && placeIds.slice(0, limit).map(id => <SavedPlace key={id} id={id} query={q} report={report} />)}
      {recipes && ids.slice(0, limit).map(id => <RecipeTile key={id} id={id} query={q} saved report={report} onGone={markGone} />)}
      {market && <SavedMarket query={q} report={report} />}
      {events && feeds.savedEvents.slice(0, limit).map(id => <SavedEvent key={id} id={id} query={q} report={report} />)}
    </View>
    {q && remaining ? <T variant="small" muted accessibilityLiveRegion="polite">{t("searchingSaves")}</T>
      : remaining && <Button label={t("more")} variant="secondary" onPress={() => setLimit(limit + 6)} />}
    {empty && <EmptyState title={t(q ? "noMatch" : "noSaved")} text="" icon="bookmark-outline" />}
  </>;
}
function SavedPlace({ id, query, report }: { id: string; query: string; report: ResultReporter }) {
  const { venue, busy, error, retry } = useCatalogueVenue(id), t = useT("profile"), food = useFood(), savedId = "catalogue-" + id;
  const count = venue ? (!query || (venue.name + " " + venue.address).toLowerCase().includes(query) ? 1 : 0) : busy ? -2 : -1;
  useEffect(() => { report("p:" + id, count); }, [report, id, count]);
  if (!venue && busy) return <TileLoading />;
  if (!venue) return <UnavailableTile retry={error ? retry : undefined} remove={() => void food.toggleSave("place", savedId)} />;
  if (!count) return null;
  return <GridTile title={venue.name} type={t("place")} path={venue.photo?.path} thumbhash={venue.photo?.thumbhash} icon="location-outline" note={venue.address}
    href={("/place/" + savedId) as Href} save={() => food.toggleSave("place", savedId)} />;
}
function SavedMarket({ query, report }: { query: string; report: ResultReporter }) {
  const t = useT("profile"), [page, setPage] = useState<{ base: string; cursor: number | null; prior: import("../../types/community").ListingCard[] }>({ base: "", cursor: null, prior: [] });
  const base = browseKey(query, { ...defaultShopFilter(), savedOnly: true }), current = page.base === base ? page : { base, cursor: null, prior: [] };
  const path = base + (current.cursor !== null ? "&cursor=" + current.cursor : ""), remote = useRemote(path, signal => browse(path, signal));
  const items = [...current.prior, ...(remote.data?.items ?? [])];
  const count = remote.data && !remote.error ? items.length : remote.loading ? -2 : -1;
  useEffect(() => { report("market", count); }, [report, count]);
  return <>{remote.loading && !remote.data && !remote.error ? <TileLoading />
    : remote.error && <View style={{ width: "100%" }}><RemoteStatus remote={remote} icon="bookmark-outline" returnTo="/social?tab=saved" /></View>}
    {items.map(l => <GridTile key={l.id} title={l.name} type={t("market")} path={l.photo} note={marketMoney(l.priceCents)} href={("/market/listing/" + l.id) as Href}
      save={async () => { await toggleSaved(l.id); setPage({ base, cursor: null, prior: [] }); invalidate("/api/market/listings"); }} />)}
    {remote.data?.next != null && <View style={{ width: "100%" }}><Button label={t("more")} variant="link" onPress={() => setPage({ base, cursor: remote.data!.next, prior: items })} /></View>}
  </>;
}
function SavedEvent({ id, query, report }: { id: string; query: string; report: ResultReporter }) {
  const isClass = id.startsWith("c:"), key = id.slice(2), feeds = useFeeds(), t = useT("profile"), language = useLanguage(), { setNotice } = usePreferences();
  const cls = useRemote(isClass ? "/api/market/classes/" + key : null, signal => cookingClass(key, signal));
  const event = useRemote(!isClass ? "/api/editorial/events/" + key : null, signal => communityRequest<ExternalEvent>("/api/editorial/events/" + encodeURIComponent(key), { signal }));
  const remote = isClass ? cls : event, name = isClass ? cls.data?.title : event.data?.title;
  const count = name ? (!query || name.toLowerCase().includes(query) ? 1 : 0) : remote.loading ? -2 : -1;
  useEffect(() => { report(id, count); }, [report, id, count]);
  if (!name && remote.loading && !remote.error) return <TileLoading />;
  if (!name) return <View style={{ width: "48%", gap: 6 }}><RemoteStatus remote={remote} icon="calendar-outline" returnTo="/social?tab=saved" />
    {!remote.loading && <Button label={t("remove")} variant="link" onPress={() => void feeds.toggleEvent(id).catch(() => setNotice({ text: t("savedFailed"), error: true }))} />}</View>;
  if (query && !name.toLowerCase().includes(query)) return null;
  const at = isClass ? cls.data!.starts : event.data!.startsAt.slice(0, 16).replace("T", " ");
  return <GridTile title={name} type={t("event")} date={formatSgShort(at, language)} save={() => feeds.toggleEvent(id)}
    onPress={() => { if (isClass) router.push(("/market/class/" + key) as Href); else { const e = event.data!; void Linking.openURL(e.registrationUrl ?? e.sources[0]).catch(() => setNotice({ text: t("unavailable"), error: true })); } }} />;
}
