import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useEditorial } from "../../hooks/useEditorial";
import type { EditorialPage, ExternalEvent } from "../../services/editorial";
import { EventCard, WhenHeading, byWhen } from "./EventCard";
import { EmptyState } from "../food/Controls";
import { Button, T } from "../ui";
import { sgDateTile, formatSgShort } from "../../utils/sg-datetime";
import { usePreferences } from "../../state/Preferences";
import { useDebounced } from "../../hooks/useDebounced";

/** Organiser titles written in capitals ("VEGETARIAN COOKING CLASS") read as shouting; show them in title case. */
const readableTitle = (title: string) => title === title.toUpperCase() && /[A-Z]{4}/.test(title)
  ? title.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase()) : title;
/** Older bot events carry this boilerplate; the closing line already says to confirm with the organiser. */
const LEGACY_FEE_NOTE = "Confirm total fees and availability with the organiser.";
export function ExternalEvents({ query }: { query: string }) {
  const q = useDebounced(query), base = "/events?q=" + encodeURIComponent(q.trim());
  const [page, setPage] = useState<{ base: string; cursor: string | null; prior: ExternalEvent[] }>({ base, cursor: null, prior: [] });
  const own = page.base === base ? page : { base, cursor: null, prior: [] };
  const remote = useEditorial<EditorialPage<ExternalEvent>>(base + (own.cursor ? "&cursor=" + encodeURIComponent(own.cursor) : ""));
  const [selected, setSelected] = useState<string | null>(null), { setNotice } = usePreferences();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const rows = [...own.prior, ...(remote.data?.items ?? [])].filter((r, index, all) => all.findIndex(x => x.id === r.id) === index && Date.parse(r.startsAt) > now);
  const open = (url: string) => { void Linking.openURL(url).catch(() => setNotice({ text: "This link could not open. Please try again.", error: true })); };
  return <>
    {remote.loading && !remote.data && <T muted>Loading local events...</T>}
    {!remote.loading && !remote.error && remote.data && !rows.length && <EmptyState icon="megaphone-outline" title={q.trim() ? "No matching events" : "No local events coming up"} text="" />}
    {remote.error && <EmptyState icon="cloud-offline-outline" title="Couldn't load events" text="Check your connection and try again." primary={{ label: "Try Again", onPress: remote.refresh }} />}
    {byWhen(rows, event => event.startsAt).map(group => <View key={group.title} style={{ gap: 10 }}>
      <WhenHeading title={group.title} />
      {group.items.map(event => {
        const localTime = event.startsAt.slice(0, 16).replace("T", " "), tile = sgDateTile(localTime), expanded = selected === event.id;
        const endTime = event.endsAt ? sgDateTile(event.endsAt.slice(0, 16).replace("T", " "))?.time : undefined;
        // The venue line is skipped when it only repeats the organiser.
        const sameVenue = event.location.toLowerCase().includes(event.organiser.toLowerCase());
        const feeNote = event.feeNote === LEGACY_FEE_NOTE ? "" : event.feeNote;
        // A fee note with several amounts (a range or ticket tiers) makes the tag a starting price.
        const fee = event.feeAmount === 0 ? "Free" : event.feeAmount !== null && event.currency === "SGD" ? (/\d[\d.,]*\D+\d/.test(feeNote) ? "From S$" : "S$") + event.feeAmount : "";
        return <EventCard key={event.id} starts={localTime} title={readableTitle(event.title)} time={(tile?.time ?? formatSgShort(localTime)) + (endTime ? " – " + endTime : "")}
          place={sameVenue ? event.organiser : event.location + " · " + event.organiser} tags={fee ? [{ label: fee, tone: fee === "Free" ? "success" : "accent" }] : []}
          onPress={() => setSelected(expanded ? null : event.id)}>
          {expanded && <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}><T>{event.address}</T><T variant="small">{event.dietEvidence}</T>
            {!!feeNote && <T variant="small">{feeNote}</T>}
            <T variant="small" muted>Checked {event.checkedAt}. Confirm details with the organiser.</T>
            <Button label="Organiser & Registration" icon="open-outline" variant="secondary" onPress={() => open(event.registrationUrl ?? event.sources[0])} />
          </View>}
        </EventCard>;
      })}
    </View>)}
    {remote.data?.nextCursor && rows.length < 80 && <Button label="More Local Events" variant="secondary" disabled={remote.loading} onPress={() => setPage({ base, prior: rows, cursor: remote.data!.nextCursor })} />}
  </>;
}
