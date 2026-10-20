import { View } from "react-native";
import { EmptyState } from "../../components/food/Controls";
import { EventCard, WhenHeading, byWhen } from "../../components/social/EventCard";
import { openSocial } from "../../components/social/Shared";
import { DateTile, ListItem, StatusPill } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { gatherings } from "../../services/social-api";
import { formatSgShort, sgDateTile } from "../../utils/sg-datetime";
import type { Gathering } from "../../types/community";
import { dietSummary } from "../../config/preferences";
import { ExternalEvents } from "../../components/social/ExternalEvents";
export const eventTypes = ["Tables", "Gatherings", "Local events", "Classes", "Home dining"] as const;
export const eventTypeOptions = [{ id: "Tables", label: "Tables", icon: "restaurant-outline" }, { id: "Gatherings", label: "Gatherings", icon: "people-outline" },
  { id: "Local events", label: "Local events", icon: "megaphone-outline" },
  { id: "Classes", label: "Classes", icon: "school-outline" }, { id: "Home dining", label: "Home dining", icon: "home-outline" }] as const;
export function GatheringRow({ g, status }: { g: Gathering; status?: string }) {
  const tile = sgDateTile(g.starts ?? ""), going = g.going + " of " + g.seats + " going";
  const badge = status ?? (g.mine ? "Hosting" : g.joined ? "Going" : g.going >= g.seats ? "Full" : undefined);
  return <ListItem title={g.title} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
    badge={badge ? <StatusPill label={badge} tone={badge === "Full" || status ? "muted" : "accent"} /> : undefined}
    subtitle={[tile && tile.weekday + " " + tile.time, g.area].filter(Boolean).join(" · ")} detail={[going, dietSummary(g.diets), g.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(" · ")}
    label={[g.title, badge, formatSgShort(g.starts ?? ""), g.area, going, dietSummary(g.diets), g.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(", ")} onPress={() => openSocial("/gathering/" + g.id)} />;
}
/** Posted gatherings from everyone; classes and home dining open once hosts are approved. */
export function Events({ query, type }: { query: string; type: Exclude<typeof eventTypes[number], "Tables"> }) {
  const search = useDebounced(query), remote = useRemote(type === "Gatherings" ? "/api/social/gatherings?q=" + search.trim() : null, signal => gatherings(search, signal));
  if (type === "Local events") return <ExternalEvents query={query} />;
  if (type !== "Gatherings") {
    const classes = type === "Classes";
    return <EmptyState title={classes ? "No Cooking Classes Yet" : "No Home Dining Yet"} text="" icon={classes ? "school-outline" : "home-outline"}
      action={classes ? "Apply To Teach" : "Apply To Host"} onPress={() => openSocial("/application/new?kind=" + (classes ? "class" : "home"))} />;
  }
  return <>
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? byWhen(remote.data.items, g => g.starts ?? "").map(group => <View key={group.title} style={{ gap: 10 }}>
      <WhenHeading title={group.title} />
      {group.items.map(g => { const tile = sgDateTile(g.starts ?? ""), badge = g.mine ? "Hosting" : g.joined ? "Going" : g.going >= g.seats ? "Full" : "";
        return <EventCard key={g.id} starts={g.starts ?? ""} title={g.title} time={tile?.time ?? ""} place={[g.venue, g.area].filter(Boolean).join(", ")}
          tags={[...(badge ? [{ label: badge, tone: badge === "Full" ? "muted" as const : "accent" as const }] : []), { label: g.going + " of " + g.seats + " going", tone: "muted" as const }, { label: dietSummary(g.diets), tone: "success" as const }]}
          onPress={() => openSocial("/gathering/" + g.id)} />; })}
    </View>)
      : <EmptyState title={search.trim() ? "No Matching Gatherings" : "No Gatherings Yet"} text="" icon="people-outline"
        action={search.trim() ? undefined : "Create Gathering"} onPress={() => openSocial("/gathering/new")} />)}
  </>;
}
