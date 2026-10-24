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
import { ExternalEvents } from "../../components/social/ExternalEvents";
import { useDietSummary } from "../../components/social/MeetUI";
import { useLanguage, useT } from "../../i18n";
export const eventTypes = ["Tables", "Gatherings", "Local events", "Classes", "Home dining"] as const;
export const eventTypeOptions = [{ id: "Tables", label: "Tables", icon: "restaurant-outline" }, { id: "Gatherings", label: "Gatherings", icon: "people-outline" },
  { id: "Local events", label: "Local events", icon: "megaphone-outline" },
  { id: "Classes", label: "Classes", icon: "school-outline" }, { id: "Home dining", label: "Home dining", icon: "home-outline" }] as const;
/** Hosting, Going or Full on someone's gathering, as a message key. */
const gatheringBadge = (g: Gathering) => g.mine ? "hosting" : g.joined ? "going" : g.going >= g.seats ? "full" : undefined;
/** `status` replaces the badge: Draft, Cancelled or Past in My plans. */
export function GatheringRow({ g, status }: { g: Gathering; status?: "draft" | "cancelled" | "past" }) {
  const t = useT("social"), language = useLanguage(), dietSummary = useDietSummary();
  const tile = sgDateTile(g.starts ?? "", language), going = t("goingOf", { going: g.going, seats: g.seats }), key = status ?? gatheringBadge(g), badge = key ? t(key) : undefined;
  const alcohol = g.alcoholFree ? t("alcoholFree") : "";
  return <ListItem title={g.title} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
    badge={badge ? <StatusPill label={badge} tone={key === "full" || status ? "muted" : "accent"} /> : undefined}
    subtitle={[tile && tile.weekday + " " + tile.time, g.area].filter(Boolean).join(" · ")} detail={[going, dietSummary(g.diets), alcohol].filter(Boolean).join(" · ")}
    label={[g.title, badge, formatSgShort(g.starts ?? "", language), g.area, going, dietSummary(g.diets), alcohol].filter(Boolean).join(", ")} onPress={() => openSocial("/gathering/" + g.id)} />;
}
/** Posted gatherings from everyone; classes and home dining open once hosts are approved. */
export function Events({ query, type }: { query: string; type: Exclude<typeof eventTypes[number], "Tables"> }) {
  const t = useT("social"), language = useLanguage(), dietSummary = useDietSummary();
  const search = useDebounced(query), remote = useRemote(type === "Gatherings" ? "/api/social/gatherings?q=" + search.trim() : null, signal => gatherings(search, signal));
  if (type === "Local events") return <ExternalEvents query={query} />;
  if (type !== "Gatherings") {
    const classes = type === "Classes";
    return <EmptyState title={t(classes ? "noClassesYet" : "noHomeDiningYet")} text="" icon={classes ? "school-outline" : "home-outline"}
      action={t(classes ? "applyToTeach" : "applyToHost")} onPress={() => openSocial("/application/new?kind=" + (classes ? "class" : "home"))} />;
  }
  return <>
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? byWhen(remote.data.items, g => g.starts ?? "").map(group => <View key={group.title} style={{ gap: 10 }}>
      <WhenHeading title={group.title} />
      {group.items.map(g => { const tile = sgDateTile(g.starts ?? "", language), badge = gatheringBadge(g);
        return <EventCard key={g.id} starts={g.starts ?? ""} title={g.title} time={tile?.time ?? ""} place={[g.venue, g.area].filter(Boolean).join(", ")}
          tags={[...(badge ? [{ label: t(badge), tone: badge === "full" ? "muted" as const : "accent" as const }] : []), { label: t("goingOf", { going: g.going, seats: g.seats }), tone: "muted" as const }, { label: dietSummary(g.diets), tone: "success" as const }]}
          onPress={() => openSocial("/gathering/" + g.id)} />; })}
    </View>)
      : <EmptyState title={t(search.trim() ? "noMatchingGatherings" : "noGatheringsYet")} text="" icon="people-outline"
        action={search.trim() ? undefined : t("createGathering")} onPress={() => openSocial("/gathering/new")} />)}
  </>;
}
