import * as Linking from "expo-linking";
import { useEffect, useState, type ReactNode } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useEditorial } from "../../hooks/useEditorial";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import type { EditorialPage, ExternalEvent } from "../../services/editorial";
import { classes as loadClasses } from "../../services/classes-api";
import type { CookingClass } from "../../types/community";
import { EventCard, byWhen, type EventTag } from "./EventCard";
import { useFeeds, type EventFilters } from "../../state/Feeds";
import { matchesEventFilters } from "../../utils/feed-filters";
import { distanceKm } from "../../utils/discovery-search";
import { planningAreaFor } from "../../utils/planning-area";
import type { SearchPoint } from "../../types/location-search";
import { IconButton, EmptyState } from "../food/Controls";
import { Button, T } from "../ui";
import { sgDateTile, formatSgShort } from "../../utils/sg-datetime";
import { useLanguage, useT } from "../../i18n";
import { ScreenList } from "../ScreenList";
import { RowSkeleton, SkeletonList } from "../Skeleton";
import { money } from "../../utils/food-format";
import { usePreferences } from "../../state/Preferences";
import { openMarket } from "./ClassParts";
import { areas } from "../../data/areas";

/** Organiser titles written in capitals ("VEGETARIAN COOKING CLASS") read as shouting; show them in title case. */
const readableTitle = (title: string) => title === title.toUpperCase() && /[A-Z]{4}/.test(title)
  ? title.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase()) : title;
/** Older bot events carry this boilerplate; the closing line already says to confirm with the organiser. */
const LEGACY_FEE_NOTE = "Confirm total fees and availability with the organiser.";
type Place = { point: SearchPoint | null; area: string };
type Item = { kind: "event"; at: string; event: ExternalEvent; place: Place } | { kind: "class"; at: string; item: CookingClass; place: Place };
/**
 * An event's map point (from the server) and the text an area choice matches: its planning area plus its own address, since
 * area names such as Bugis or Tiong Bahru are not planning areas.
 */
function placeOf(event: ExternalEvent): Place {
  const p = event.point, point = p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { latitude: p.lat, longitude: p.lng } : null;
  return { point, area: [point ? planningAreaFor(point.latitude, point.longitude)?.name : "", event.location, event.address].filter(Boolean).join(" ") };
}
/** A class has no address point; when its area is a named area with a centre (Tiong Bahru, Bugis and so on), Near me measures from there. */
function classPlace(c: CookingClass): Place {
  const named = areas.find(area => area.name.toLowerCase() === c.area.trim().toLowerCase());
  return { point: named?.lat !== undefined && named.lng !== undefined ? { latitude: named.lat, longitude: named.lng } : null, area: c.area + " " + c.venue };
}
const matches = (c: CookingClass, q: string) => !q || [c.title, c.makes, c.venue, c.area, c.teacher.name].join(" ").toLowerCase().includes(q.toLowerCase());

function ExternalCard({ event, open, expanded, onPress, action, distance }: { action?: ReactNode; event: ExternalEvent; open: (url: string) => void; expanded: boolean; onPress: () => void; distance?: string }) {
  const t = useT("market"), language = useLanguage(), { reducedMotion } = usePreferences(), localTime = event.startsAt.slice(0, 16).replace("T", " "), tile = sgDateTile(localTime, language);
  const endTime = event.endsAt ? sgDateTile(event.endsAt.slice(0, 16).replace("T", " "), language)?.time : undefined;
  // The venue line is skipped when it only repeats the organiser.
  const sameVenue = event.location.toLowerCase().includes(event.organiser.toLowerCase()), feeNote = event.feeNote === LEGACY_FEE_NOTE ? "" : event.feeNote;
  // A fee note with several amounts (a range or ticket tiers) makes the tag a starting price.
  const free = event.feeAmount === 0, fee = free ? t("freeTag") : event.feeAmount !== null && event.currency === "SGD"
    ? t(/\d[\d.,]*\D+\d/.test(feeNote) ? "fromPrice" : "priceAmount", { amount: event.feeAmount }) : "";
  return <EventCard action={action} starts={localTime} title={readableTitle(event.title)} time={(tile?.time ?? formatSgShort(localTime, language)) + (endTime ? " – " + endTime : "")}
    place={(sameVenue ? event.organiser : event.location + " · " + event.organiser) + (distance ? " · " + distance : "")} tags={fee ? [{ label: fee, tone: free ? "success" : "accent" }] : []} onPress={onPress}>
    {expanded && <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(160)} style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}><T>{event.address}</T><T variant="small">{event.dietEvidence}</T>
      {!!feeNote && <T variant="small">{feeNote}</T>}
      <T variant="small" muted>{t("checkedNote", { date: event.checkedAt })}</T>
      <Button label={t("organiser")} icon="open-outline" variant="secondary" onPress={() => open(event.registrationUrl ?? event.sources[0])} />
    </Animated.View>}
  </EventCard>;
}
function ClassCard({ item, action, distance }: { item: CookingClass; action?: ReactNode; distance?: string }) {
  const t = useT("market"), language = useLanguage(), tile = sgDateTile(item.starts, language), end = sgDateTile(item.ends, language)?.time, left = item.seats - item.taken;
  const tags: EventTag[] = [{ label: t("classTag"), tone: "accent" }, item.joined ? { label: t("joinedTag"), tone: "success" }
    : { label: left > 0 ? t("seatsLeft", { n: left }) : t("classFull"), tone: left > 0 ? "accent" : "muted" },
    { label: item.priceCents ? money(item.priceCents / 100, language) : t("freeTag"), tone: item.priceCents ? "muted" : "success" }];
  return <EventCard action={action} starts={item.starts} title={item.title} time={(tile?.time ?? item.starts.slice(11)) + (end ? " – " + end : "")}
    place={[item.venue, item.area, distance].filter(Boolean).join(" · ")} tags={tags} onPress={() => openMarket("/class/" + item.id)} />;
}
/**
 * Events: local events from the editorial team and cooking classes by approved teachers, by date. Open to every member
 * aged 18 and over. There are no invites for events; a class reserves a seat and is paid to the teacher directly.
 */
export function EventsList({ query, filters: active }: { query: string; filters: EventFilters }) {
  const q = useDebounced(query).trim(), base = "/events?q=" + encodeURIComponent(q);
  const [page, setPage] = useState<{ base: string; cursor: string | null; prior: ExternalEvent[] }>({ base, cursor: null, prior: [] });
  const own = page.base === base ? page : { base, cursor: null, prior: [] };
  const remote = useEditorial<EditorialPage<ExternalEvent>>(base + (own.cursor ? "&cursor=" + encodeURIComponent(own.cursor) : ""), true);
  const classes = useRemote("/api/market/classes", loadClasses);
  const [selected, setSelected] = useState<string | null>(null), { setNotice } = usePreferences();
  const t = useT("market"), tc = useT("common"), [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const feeds = useFeeds(), tf = useT("feeds"), kind = active.kind;
  const away = (item: Item) => active.near && item.place.point ? distanceKm(active.near, item.place.point) : null;
  const events = [...own.prior, ...(remote.data?.items ?? [])].filter((r, index, all) => all.findIndex(x => x.id === r.id) === index && Date.parse(r.startsAt) > now);
  // A few dozen rows at most, so the merge and sort simply run each render.
  const items: Item[] = [
    ...(kind === "classes" ? [] : events.map(event => ({ kind: "event" as const, at: event.startsAt.slice(0, 16).replace("T", " "), event, place: placeOf(event) }))),
    ...(kind === "local" ? [] : (classes.data?.items ?? []).filter(c => matches(c, q)).map(item => ({ kind: "class" as const, at: item.starts, item, place: classPlace(item) })))]
    .filter(item => matchesEventFilters({ at: item.at, ...item.place, price: item.kind === "event" ? item.event.feeAmount : item.item.priceCents,
      saved: feeds.savedEvents.includes(item.kind === "event" ? "e:" + item.event.id : "c:" + item.item.id) }, active, now));
  // Near me lists what has a point nearest first, then the rest by date (This week still comes before Later).
  const distances = new Map(items.map(item => [item, away(item)]));
  items.sort((a, b) => (active.near ? (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity) || 0 : 0) || a.at.localeCompare(b.at));
  const open = (url: string) => { void Linking.openURL(url).catch(() => setNotice({ text: t("linkNotOpen"), error: true })); };
  // Either source can fail on its own; the kinds shown decide which failure matters, and Try Again reloads both.
  const loading = (kind !== "classes" && remote.loading && !remote.data) || (kind !== "local" && classes.loading && !classes.data);
  // A paused Market (SERVICE_PAUSED) simply has no classes to show; only a real failure is an error.
  const failed = (kind !== "classes" && !!remote.error) || (kind !== "local" && !!classes.error && classes.error.code !== "SERVICE_PAUSED");
  const retry = () => { remote.refresh(); classes.refresh(); };
  // This week first, then later; one list so only the cards near the screen are drawn.
  const rows = byWhen(items, item => item.at.replace(" ", "T") + ":00+08:00", now).flatMap(group => group.items);
  const row = (item: Item) => {
    const id = item.kind === "class" ? "c:" + item.item.id : "e:" + item.event.id;
    const name = item.kind === "class" ? item.item.title : item.event.title, saved = feeds.savedEvents.includes(id);
    const action = <IconButton appearance="plain" label={tf(saved ? "unsaveEvent" : "saveEvent", { name })} icon={saved ? "bookmark" : "bookmark-outline"} disabled={!feeds.savesReady}
      onPress={() => void feeds.toggleEvent(id).catch(() => setNotice({ text: tf("eventSaveFailed"), error: true }))} />;
    const km = distances.get(item), distance = km != null ? tc("kilometres", { km: km.toFixed(1) }) : undefined;
    return item.kind === "class" ? <ClassCard item={item.item} action={action} distance={distance} />
      : <ExternalCard event={item.event} action={action} open={open} expanded={selected === item.event.id} onPress={() => setSelected(selected === item.event.id ? null : item.event.id)}
        distance={distance} />;
  };
  return <ScreenList data={rows} keyExtractor={item => item.kind === "class" ? "c:" + item.item.id : "e:" + item.event.id} getItemType={item => item.kind}
    renderItem={({ item }) => row(item)} extraData={[selected, feeds.savedEvents, feeds.savesReady]} dimmed={!!remote.stale}
    header={<>
      {loading && <SkeletonList label={t("loadingEvents")} count={4} shape={() => <RowSkeleton />} />}
      {/* A failure shows once nothing is still loading, so it does not appear under the shapes and then jump up. */}
      {failed && !loading && <EmptyState icon="cloud-offline-outline" title={t("eventsFailed")} text={t("eventsFailedText")} primary={{ label: tc("tryAgain"), onPress: retry }} />}
      {!loading && !remote.stale && !items.length && !failed && <EmptyState icon="megaphone-outline" title={t(q ? "noMatchingEvents" : "noLocalEvents")} text="" />}
    </>}
    footer={kind !== "classes" && remote.data?.nextCursor && events.length < 80 ? <Button label={t("moreEvents")} variant="secondary" disabled={remote.loading}
      onPress={() => setPage({ base, prior: events, cursor: remote.data!.nextCursor })} /> : null} />;
}
