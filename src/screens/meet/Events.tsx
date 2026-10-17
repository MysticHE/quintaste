import { EmptyState } from "../../components/food/Controls";
import { openSocial } from "../../components/social/Shared";
import { DateTile, ListGroup, ListItem, StatusPill } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { gatherings } from "../../services/social-api";
import { formatSgShort, sgDateTile } from "../../utils/sg-datetime";
import type { Gathering } from "../../types/community";
import { ExternalEvents } from "../../components/social/ExternalEvents";
export const eventTypes = ["Gatherings", "Local events", "Classes", "Home dining"] as const;
export function GatheringRow({ g, status }: { g: Gathering; status?: string }) {
  const tile = sgDateTile(g.starts ?? ""), going = g.going + " of " + g.seats + " going";
  const badge = status ?? (g.mine ? "Hosting" : g.joined ? "Going" : g.going >= g.seats ? "Full" : undefined);
  return <ListItem title={g.title} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
    badge={badge ? <StatusPill label={badge} tone={badge === "Full" || status ? "muted" : "accent"} /> : undefined}
    subtitle={[tile && tile.weekday + " " + tile.time, g.area].filter(Boolean).join(" · ")} detail={[going, g.diet, g.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(" · ")}
    label={[g.title, badge, formatSgShort(g.starts ?? ""), g.area, going, g.diet, g.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(", ")} onPress={() => openSocial("/gathering/" + g.id)} />;
}
/** Posted gatherings from everyone; classes and home dining open once hosts are approved. */
export function Events({ query, type }: { query: string; type: typeof eventTypes[number] }) {
  const search = useDebounced(query), remote = useRemote(type === "Gatherings" ? "/api/social/gatherings?q=" + search.trim() : null, signal => gatherings(search, signal));
  if (type === "Local events") return <ExternalEvents query={query} />;
  if (type !== "Gatherings") {
    const classes = type === "Classes";
    return <EmptyState title={classes ? "No Cooking Classes Yet" : "No Home Dining Yet"} text="" icon={classes ? "school-outline" : "home-outline"}
      action={classes ? "Apply To Teach" : "Apply To Host"} onPress={() => openSocial("/application/new?kind=" + (classes ? "class" : "home"))} />;
  }
  return <>
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? <ListGroup>{remote.data.items.map(g => <GatheringRow key={g.id} g={g} />)}</ListGroup>
      : <EmptyState title={search.trim() ? "No Matching Gatherings" : "No Gatherings Yet"} text="" icon="people-outline"
        action={search.trim() ? undefined : "Create Gathering"} onPress={() => openSocial("/gathering/new")} />)}
  </>;
}
