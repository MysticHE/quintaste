import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useEditorial } from "../../hooks/useEditorial";
import type { EditorialPage, ExternalEvent } from "../../services/editorial";
import { DateTile, ListGroup, ListItem, StatusPill } from "../GroupedList";
import { Button, T } from "../ui";
import { sgDateTile, formatSgShort } from "../../utils/sg-datetime";
import { usePreferences } from "../../state/Preferences";
import { useDebounced } from "../../hooks/useDebounced";

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
    {!remote.loading && !remote.error && remote.data && !rows.length && <T muted>{q.trim() ? "No local events match your search." : "No upcoming local events yet."}</T>}
    {remote.error && <><T muted>{remote.error}</T><Button label="Retry Events" variant="link" onPress={remote.refresh} /></>}
    {!!rows.length && <ListGroup>{rows.map(event => {
      const localTime = event.startsAt.slice(0, 16).replace("T", " "), tile = sgDateTile(localTime), expanded = selected === event.id;
      return <View key={event.id}><ListItem title={event.title} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
        subtitle={formatSgShort(localTime) + " · " + event.organiser} detail={event.location} badge={<StatusPill label="External event" tone="muted" />}
        onPress={() => setSelected(expanded ? null : event.id)} />
        {expanded && <View style={{ padding: 16, gap: 8 }}><T>{event.address}</T><T variant="small">{event.dietEvidence}</T>
          <T variant="small">{event.feeAmount !== null && event.currency === "SGD" ? "S$" + event.feeAmount : "Check organiser for fees"}</T>
          {!!event.feeNote && <T variant="small" muted>{event.feeNote}</T>}
          <T variant="small" muted>Checked {event.checkedAt}. Confirm schedule and availability with the organiser.</T>
          <Button label="Organiser & Registration" icon="open-outline" variant="secondary" onPress={() => open(event.registrationUrl ?? event.sources[0])} />
        </View>}
      </View>;
    })}</ListGroup>}
    {remote.data?.nextCursor && rows.length < 80 && <Button label="More Local Events" variant="secondary" disabled={remote.loading} onPress={() => setPage({ base, prior: rows, cursor: remote.data!.nextCursor })} />}
  </>;
}
