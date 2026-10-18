import { FloatingAddButton } from "../../components/FloatingAddButton";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseHeader, FirstRunState, IconTabs } from "../../components/BrowseControls";
import { Icon, T, common } from "../../components/ui";
import { usePreferences } from "../../state/Preferences";
import { openSocial } from "../../components/social/Shared";
import { MemberGate, PersonRow, ProfileRow, profileState, useSocialMe } from "../../components/social/MeetUI";
import { ListGroup, ThemedSwitch } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { socialTabs, type SocialSection } from "../../components/social/SocialTabs";
import { useMeet } from "../../hooks/useMeet";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { people, peopleKey, unread } from "../../services/social-api";
import { lunarMoment } from "../../data/lunar";
import { defaultMeetFilters, type MeetFilters } from "../../types/meet";
import { Events, eventTypeOptions, eventTypes } from "./Events";
import { TypePills } from "../../components/social/EventCard";
import { PersonalPlans } from "./Plans";
import { AreasView } from "./Areas";

export const activePeopleFilters = (f: MeetFilters) => f.diet !== "All" || f.time !== "Any" || f.prefers !== "Any" || f.fivePungentFree;
/** A plant-based observance today becomes one filter chip, dismissible for the day. */
function MomentChip() {
  const { network: n, commit } = useMeet(), now = useMinuteClock(), moment = lunarMoment(now), { theme } = usePreferences();
  if (!moment || n.dismissedMoment === moment.day) return null;
  const on = n.filters.fivePungentFree;
  // Observance days are the community's own calendar: a banner with a switch, not another filter chip.
  return <View style={[common.row, s.moment, { backgroundColor: theme.successSoft, borderColor: theme.border }]}>
    <Icon name="leaf" size={20} color={theme.success} />
    <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold}>{moment.label}</T><T variant="small" muted>Show people who skip the five pungent today</T></View>
    <ThemedSwitch label={"Only people with no five pungent, " + moment.label} value={on} onChange={value => void commit({ type: "filters", filters: { ...n.filters, fivePungentFree: value } })} />
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
      : <FirstRunState icon="people-outline" title="No one is open to plans yet" text="Turn on Open to plans so people nearby can invite you."
        action={{ label: "Open My Profile", icon: "person-outline", onPress: () => openSocial("/profile") }} />)}
  </>;
}
export function MeetHomeScreen() {
  const { tab, eventType } = useLocalSearchParams<{ tab?: string; eventType?: string }>();
  const section: SocialSection = tab === "events" || tab === "plans" || tab === "areas" ? tab : "people";
  const type = eventTypes.find(value => value === eventType) ?? "Local events";
  const [query, setQuery] = useState(""), [plansEmpty, setPlansEmpty] = useState(false);
  const { network: n } = useMeet(), { member } = useMember();
  const counts = useRemote(member ? "/api/social/unread" : null, unread, 30000).data, badge = (counts?.invitations ?? 0) + (counts?.messages ?? 0);
  const select = (value: SocialSection) => { if (value === section) return; router.setParams({ tab: value, eventType: value === "events" ? type : undefined }); setQuery(""); };
  const filtered = activePeopleFilters(n.filters);
  return <Screen title="Social" back={false} contentStyle={{ paddingHorizontal: 12 }} header={<BrowseHeader query={query} onChange={setQuery}
    placeholder={section === "people" ? "Find people" : section === "events" ? "Find events" : section === "areas" ? "Find areas" : "Find my plans"}
    filter={section === "people" ? { label: "People filters", count: filtered ? 1 : 0, onPress: () => openSocial("/filters") } : undefined}
    action={<IconButton label={badge ? `Inbox, ${badge} new` : "Inbox"} icon="chatbubbles-outline" badge={badge} onPress={() => openSocial("/inbox")} />} />}
    floatingAction={member && (section === "events" || section === "plans" && !plansEmpty) ? <FloatingAddButton label="Create Event" onPress={() => openSocial("/create")} /> : undefined}>
    <IconTabs tabs={socialTabs} value={section} onChange={select} label="Social sections" />
    {section === "events" && <TypePills options={eventTypeOptions} value={type} onChange={label => router.setParams({ eventType: label })} />}
    {section === "events" && type === "Local events" ? <Events query={query} type={type} /> : <MemberGate returnTo="/social">{section === "people" ? <People query={query} /> : section === "events" ? <Events query={query} type={type} />
      : section === "areas" ? <AreasView query={query} /> : <PersonalPlans query={query} onEmpty={setPlansEmpty} />}</MemberGate>}
  </Screen>;
}
const s = StyleSheet.create({ moment: { gap: 10, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 4, paddingVertical: 8 } });
