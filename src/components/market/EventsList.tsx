import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useEditorial } from "../../hooks/useEditorial";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { useMember } from "../CommunityGate";
import type { EditorialPage, ExternalEvent } from "../../services/editorial";
import { classes as loadClasses } from "../../services/classes-api";
import type { CookingClass } from "../../types/community";
import { EventCard, TypePills, WhenHeading, byWhen, type EventTag } from "./EventCard";
import { EmptyState } from "../food/Controls";
import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { Button, T } from "../ui";
import { sgDateTile, formatSgShort } from "../../utils/sg-datetime";
import { useLanguage, useT } from "../../i18n";
import { money } from "../../utils/food-format";
import { usePreferences } from "../../state/Preferences";
import { openMarket } from "./ClassParts";

/** Organiser titles written in capitals ("VEGETARIAN COOKING CLASS") read as shouting; show them in title case. */
const readableTitle = (title: string) => title === title.toUpperCase() && /[A-Z]{4}/.test(title)
  ? title.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase()) : title;
/** Older bot events carry this boilerplate; the closing line already says to confirm with the organiser. */
const LEGACY_FEE_NOTE = "Confirm total fees and availability with the organiser.";
type Kind = "all" | "local" | "classes";
type Item = { kind: "event"; at: string; event: ExternalEvent } | { kind: "class"; at: string; item: CookingClass };
const matches = (c: CookingClass, q: string) => !q || [c.title, c.makes, c.venue, c.area, c.teacher.name].join(" ").toLowerCase().includes(q.toLowerCase());

function ExternalCard({ event, open, expanded, onPress }: { event: ExternalEvent; open: (url: string) => void; expanded: boolean; onPress: () => void }) {
  const t = useT("market"), language = useLanguage(), localTime = event.startsAt.slice(0, 16).replace("T", " "), tile = sgDateTile(localTime, language);
  const endTime = event.endsAt ? sgDateTile(event.endsAt.slice(0, 16).replace("T", " "), language)?.time : undefined;
  // The venue line is skipped when it only repeats the organiser.
  const sameVenue = event.location.toLowerCase().includes(event.organiser.toLowerCase()), feeNote = event.feeNote === LEGACY_FEE_NOTE ? "" : event.feeNote;
  // A fee note with several amounts (a range or ticket tiers) makes the tag a starting price.
  const free = event.feeAmount === 0, fee = free ? t("freeTag") : event.feeAmount !== null && event.currency === "SGD"
    ? t(/\d[\d.,]*\D+\d/.test(feeNote) ? "fromPrice" : "priceAmount", { amount: event.feeAmount }) : "";
  return <EventCard starts={localTime} title={readableTitle(event.title)} time={(tile?.time ?? formatSgShort(localTime, language)) + (endTime ? " – " + endTime : "")}
    place={sameVenue ? event.organiser : event.location + " · " + event.organiser} tags={fee ? [{ label: fee, tone: free ? "success" : "accent" }] : []} onPress={onPress}>
    {expanded && <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}><T>{event.address}</T><T variant="small">{event.dietEvidence}</T>
      {!!feeNote && <T variant="small">{feeNote}</T>}
      <T variant="small" muted>{t("checkedNote", { date: event.checkedAt })}</T>
      <Button label={t("organiser")} icon="open-outline" variant="secondary" onPress={() => open(event.registrationUrl ?? event.sources[0])} />
    </View>}
  </EventCard>;
}
function ClassCard({ item }: { item: CookingClass }) {
  const t = useT("market"), language = useLanguage(), tile = sgDateTile(item.starts, language), end = sgDateTile(item.ends, language)?.time, left = item.seats - item.taken;
  const tags: EventTag[] = [{ label: t("classTag"), tone: "accent" }, item.joined ? { label: t("joinedTag"), tone: "success" }
    : { label: left > 0 ? t("seatsLeft", { n: left }) : t("classFull"), tone: left > 0 ? "accent" : "muted" },
    { label: item.priceCents ? money(item.priceCents / 100, language) : t("freeTag"), tone: item.priceCents ? "muted" : "success" }];
  return <EventCard starts={item.starts} title={item.title} time={(tile?.time ?? item.starts.slice(11)) + (end ? " – " + end : "")}
    place={[item.venue, item.area].filter(Boolean).join(" · ")} tags={tags} onPress={() => openMarket("/class/" + item.id)} />;
}
/**
 * Events: local events from the editorial team and cooking classes by approved teachers, by date. Open to every member
 * aged 18 and over. There are no invites for events; a class reserves a seat and is paid to the teacher directly.
 */
export function EventsList({ query }: { query: string }) {
  const q = useDebounced(query).trim(), base = "/events?q=" + encodeURIComponent(q), { member } = useMember();
  const [page, setPage] = useState<{ base: string; cursor: string | null; prior: ExternalEvent[] }>({ base, cursor: null, prior: [] });
  const own = page.base === base ? page : { base, cursor: null, prior: [] };
  const remote = useEditorial<EditorialPage<ExternalEvent>>(base + (own.cursor ? "&cursor=" + encodeURIComponent(own.cursor) : ""));
  const classes = useRemote("/api/market/classes", loadClasses);
  const [kind, setKind] = useState<Kind>("all"), [selected, setSelected] = useState<string | null>(null), { setNotice } = usePreferences();
  const t = useT("market"), tc = useT("common"), [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const events = [...own.prior, ...(remote.data?.items ?? [])].filter((r, index, all) => all.findIndex(x => x.id === r.id) === index && Date.parse(r.startsAt) > now);
  // A few dozen rows at most, so the merge and sort simply run each render.
  const items: Item[] = [
    ...(kind === "classes" ? [] : events.map(event => ({ kind: "event" as const, at: event.startsAt.slice(0, 16).replace("T", " "), event }))),
    ...(kind === "local" ? [] : (classes.data?.items ?? []).filter(c => matches(c, q)).map(item => ({ kind: "class" as const, at: item.starts, item })))]
    .sort((a, b) => a.at.localeCompare(b.at));
  const open = (url: string) => { void Linking.openURL(url).catch(() => setNotice({ text: t("linkNotOpen"), error: true })); };
  const kinds = useMemo(() => [{ id: "all" as const, label: t("eventsAll"), icon: "apps-outline" as const }, { id: "local" as const, label: t("eventsLocal"), icon: "megaphone-outline" as const },
    { id: "classes" as const, label: t("eventsClasses"), icon: "school-outline" as const }], [t]);
  // Either source can fail on its own; the kinds shown decide which failure matters, and Try Again reloads both.
  const loading = (kind !== "classes" && remote.loading && !remote.data) || (kind !== "local" && classes.loading && !classes.data);
  // A paused Market (SERVICE_PAUSED) simply has no classes to show; only a real failure is an error.
  const failed = (kind !== "classes" && !!remote.error) || (kind !== "local" && !!classes.error && classes.error.code !== "SERVICE_PAUSED");
  const retry = () => { remote.refresh(); classes.refresh(); };
  return <>
    <TypePills options={kinds} value={kind} onChange={setKind} />
    {loading && <T muted>{t("loadingEvents")}</T>}
    {failed && <EmptyState icon="cloud-offline-outline" title={t("eventsFailed")} text={t("eventsFailedText")} primary={{ label: tc("tryAgain"), onPress: retry }} />}
    {!loading && !items.length && !failed && <EmptyState icon="megaphone-outline" title={t(q ? "noMatchingEvents" : "noLocalEvents")} text="" />}
    {byWhen(items, item => item.at.replace(" ", "T") + ":00+08:00", now).map(group => <View key={group.title} style={{ gap: 10 }}>
      <WhenHeading title={group.title} />
      {group.items.map(item => item.kind === "class" ? <ClassCard key={"c" + item.item.id} item={item.item} />
        : <ExternalCard key={item.event.id} event={item.event} open={open} expanded={selected === item.event.id} onPress={() => setSelected(selected === item.event.id ? null : item.event.id)} />)}
    </View>)}
    {kind !== "classes" && remote.data?.nextCursor && events.length < 80 && <Button label={t("moreEvents")} variant="secondary" disabled={remote.loading}
      onPress={() => setPage({ base, prior: events, cursor: remote.data!.nextCursor })} />}
    {member && <ListGroup><ListItem title={t("myClassesRow")} leading={<RowIcon name="school-outline" />} onPress={() => openMarket("/teaching")} /></ListGroup>}
  </>;
}
