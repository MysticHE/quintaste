import { FloatingAddButton } from "../../components/FloatingAddButton";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Chip, Chips, EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseHeader } from "../../components/BrowseControls";
import { common } from "../../components/ui";
import { openSocial } from "../../components/social/Shared";
import { MemberGate, PersonRow, ProfileRow, profileState, useSocialMe } from "../../components/social/MeetUI";
import { ListGroup } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { SocialTabs, type SocialSection } from "../../components/social/SocialTabs";
import { useMeet } from "../../hooks/useMeet";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { people, peopleKey, unread } from "../../services/social-api";
import { lunarMoment } from "../../data/lunar";
import { defaultMeetFilters, type MeetFilters } from "../../types/meet";
import { Events, eventTypes } from "./Events";
import { PersonalPlans } from "./Plans";
import { AreasView } from "./Areas";

export const activePeopleFilters = (f: MeetFilters) => f.diet !== "All" || f.time !== "Any" || f.prefers !== "Any" || f.fivePungentFree;
/** A plant-based observance today becomes one filter chip, dismissible for the day. */
function MomentChip() {
  const { network: n, commit } = useMeet(), now = useMinuteClock(), moment = lunarMoment(now);
  if (!moment || n.dismissedMoment === moment.day) return null;
  const on = n.filters.fivePungentFree;
  return <View style={[common.row, { gap: 8 }]}>
    <View style={[common.flex, { minWidth: 0, alignItems: "flex-start" }]}><Chip label={moment.label + " · No five pungent"} icon="leaf-outline" role="checkbox" compact selected={on}
      onPress={() => void commit({ type: "filters", filters: { ...n.filters, fivePungentFree: !on } })} /></View>
    <IconButton label={"Hide " + moment.label} icon="close" onPress={() => void commit({ type: "dismiss-moment", day: moment.day })} />
  </View>;
}
function People({ query }: { query: string }) {
  const { network: n, commit } = useMeet(), mine = useSocialMe().data?.profile;
  const search = useDebounced(query), key = peopleKey(search, n.filters), remote = useRemote(key, signal => people(key, signal));
  const filtered = activePeopleFilters(n.filters) || !!search.trim();
  return <>
    {mine && profileState(mine).label !== "Open to plans" && <ListGroup><ProfileRow profile={mine} /></ListGroup>}
    <MomentChip />
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? <ListGroup>{remote.data.items.map(person => <PersonRow key={person.id} person={person} />)}</ListGroup>
      : filtered ? <EmptyState title="No Matches" text="" action={activePeopleFilters(n.filters) ? "Clear Filters" : undefined}
        onPress={() => void commit({ type: "filters", filters: defaultMeetFilters() })} />
      : <EmptyState title="No One Here Yet" text="" icon="people-outline" />)}
  </>;
}
export function MeetHomeScreen() {
  const { tab, eventType } = useLocalSearchParams<{ tab?: string; eventType?: string }>();
  const section: SocialSection = tab === "events" || tab === "plans" || tab === "areas" ? tab : "people";
  const type = eventTypes.find(value => value === eventType) ?? "Local events";
  const [query, setQuery] = useState("");
  const { network: n } = useMeet(), { member } = useMember();
  const counts = useRemote(member ? "/api/social/unread" : null, unread, 30000).data, badge = (counts?.invitations ?? 0) + (counts?.messages ?? 0);
  const select = (value: SocialSection) => { if (value === section) return; router.setParams({ tab: value, eventType: value === "events" ? type : undefined }); setQuery(""); };
  const filtered = activePeopleFilters(n.filters);
  return <Screen title="Social" back={false} contentStyle={{ paddingHorizontal: 12 }} header={<BrowseHeader query={query} onChange={setQuery}
    placeholder={section === "people" ? "Find people" : section === "events" ? "Find events" : section === "areas" ? "Find areas" : "Find my plans"}
    action={<IconButton label={badge ? `Inbox, ${badge} new` : "Inbox"} icon="chatbubbles-outline" badge={badge} onPress={() => openSocial("/inbox")} />} />}
    floatingAction={member && (section === "events" || section === "plans") ? <FloatingAddButton label="Create Event" onPress={() => openSocial("/create")} /> : undefined}>
    <View testID="browse-options-row" style={[common.row, { gap: 8 }]}><SocialTabs value={section} onChange={select} />
      {section === "people" && <IconButton label={"People Filters" + (filtered ? ", active" : "")} icon="options-outline"
        selected={filtered} onPress={() => openSocial("/filters")} />}
    </View>
    {section === "events" && <Chips label="Event Type">{eventTypes.map(label => <Chip key={label} label={label} role="radio"
      selected={type === label} onPress={() => router.setParams({ eventType: label })} />)}</Chips>}
    {section === "events" && type === "Local events" ? <Events query={query} type={type} /> : <MemberGate returnTo="/social">{section === "people" ? <People query={query} /> : section === "events" ? <Events query={query} type={type} />
      : section === "areas" ? <AreasView query={query} /> : <PersonalPlans query={query} findPeople={() => select("people")} />}</MemberGate>}
  </Screen>;
}
