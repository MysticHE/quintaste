import { FloatingAddButton } from "../../components/FloatingAddButton";
import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseHeader, FirstRunState, IconTabs } from "../../components/BrowseControls";
import { Icon, T, common } from "../../components/ui";
import { usePreferences } from "../../state/Preferences";
import { openSocial } from "../../components/social/Shared";
import { MemberGate, ProfileRow, profileState, useSocialMe } from "../../components/social/MeetUI";
import { PersonCard } from "../../components/social/PersonCard";
import { InviteSheet } from "../../components/social/InviteSheet";
import { ListGroup, ThemedSwitch } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { readSection, socialTabs, type SocialSection } from "../../components/social/SocialTabs";
import { useMeet } from "../../hooks/useMeet";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { people, peopleKey, unread } from "../../services/social-api";
import { lunarMoment } from "../../data/lunar";
import { inCommon } from "../../utils/social-match";
import { defaultMeetFilters, type MeetFilters } from "../../types/meet";
import type { Person } from "../../types/community";
import { Events, eventTypeOptions, eventTypes } from "./Events";
import { TypePills } from "../../components/social/EventCard";
import { PersonalPlans } from "./Plans";
import { NearbyView } from "./Nearby";
import { TablesView } from "./Tables";
import { skippedWelcome } from "./Onboarding";

export const activePeopleFilters = (f: MeetFilters) => f.diets.length > 0 || f.time !== "Any" || f.prefers !== "Any" || f.hereFor !== "Any"
  || f.religions.length > 0 || f.languages.length > 0 || f.hobbies.length > 0 || f.ages.length > 0 || f.sameArea;
/** A plant-based observance today becomes one filter chip, dismissible for the day. */
function MomentChip() {
  const { network: n, commit } = useMeet(), now = useMinuteClock(), moment = lunarMoment(now), { theme } = usePreferences();
  if (!moment || n.dismissedMoment === moment.day) return null;
  const on = n.filters.diets.includes("Vegetarian"), others = n.filters.diets.filter(d => d !== "Vegetarian");
  // Observance days are the community's own calendar: a banner with a switch, not another filter chip.
  return <View style={[common.row, s.moment, { backgroundColor: theme.successSoft, borderColor: theme.border }]}>
    <Icon name="leaf" size={20} color={theme.success} />
    <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold}>{moment.label}</T><T variant="small" muted>Show people who skip the five pungent today</T></View>
    <ThemedSwitch label={"Only people with no five pungent, " + moment.label} value={on} onChange={value => void commit({ type: "filters", filters: { ...n.filters, diets: value ? [...others, "Vegetarian"] : others } })} />
    <IconButton label={"Hide " + moment.label} icon="close" onPress={() => void commit({ type: "dismiss-moment", day: moment.day })} />
  </View>;
}
/** People cards sorted by how much you have in common; Invite opens a plan for that person. */
function People({ query }: { query: string }) {
  const { network: n, commit } = useMeet(), mine = useSocialMe().data?.profile, [inviting, setInviting] = useState<{ person: Person; kaki: boolean } | null>(null);
  const search = useDebounced(query), key = peopleKey(search, n.filters), remote = useRemote(key, signal => people(key, signal));
  const filtered = activePeopleFilters(n.filters) || !!search.trim();
  const sorted = useMemo(() => (remote.data?.items ?? []).map(person => ({ person, shared: inCommon(mine, person) }))
    .sort((a, b) => b.shared.length - a.shared.length), [remote.data, mine]);
  const invite = (person: Person, kaki = false) => mine && profileState(mine).label === "Open to plans" ? setInviting({ person, kaki }) : openSocial("/profile");
  return <>
    {mine && profileState(mine).label !== "Open to plans" && <ListGroup><ProfileRow profile={mine} /></ListGroup>}
    <MomentChip />
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (sorted.length ? sorted.map(({ person, shared }) => <PersonCard key={person.id} person={person} common={shared}
      onInvite={() => invite(person)} onKaki={() => invite(person, true)} />)
      : filtered ? <EmptyState title="No Matches" text="" action={activePeopleFilters(n.filters) ? "Clear Filters" : undefined}
        onPress={() => void commit({ type: "filters", filters: defaultMeetFilters() })} />
      : <FirstRunState icon="people-outline" title="No one is open to plans yet" text="Turn on Open to plans so people nearby can invite you."
        action={{ label: "Open My Profile", icon: "person-outline", onPress: () => openSocial("/profile") }} />)}
    {inviting && mine && <InviteSheet person={inviting.person} me={mine} pickKaki={inviting.kaki} visible onClose={() => setInviting(null)} />}
  </>;
}
/** Tables first; gatherings, local events, classes and home dining sit beside them. */
function TablesTab({ query }: { query: string }) {
  const { eventType, area } = useLocalSearchParams<{ eventType?: string; area?: string }>();
  const type = eventTypes.find(value => value === eventType) ?? "Tables";
  return <>
    <TypePills options={eventTypeOptions} value={type} onChange={label => router.setParams({ eventType: label })} />
    {type === "Tables" ? <MemberGate returnTo="/social?tab=tables"><TablesView query={query} area={area ?? null} /></MemberGate>
      : type === "Local events" ? <Events query={query} type={type} /> : <MemberGate returnTo="/social?tab=tables"><Events query={query} type={type} /></MemberGate>}
  </>;
}
/** First open of Social with an empty profile goes to the short setup, once per app session. */
function useWelcome(section: SocialSection) {
  const me = useSocialMe().data;
  useEffect(() => {
    if (me && !me.profile.firstName && !skippedWelcome.current && section !== "tables") router.push("/social/welcome");
  }, [me, section]);
}
export function MeetHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const section = readSection(tab);
  const [query, setQuery] = useState(""), [plansEmpty, setPlansEmpty] = useState(false);
  const { network: n } = useMeet(), { member } = useMember();
  const counts = useRemote(member ? "/api/social/unread" : null, unread, 30000).data, badge = (counts?.invitations ?? 0) + (counts?.messages ?? 0);
  useWelcome(section);
  const select = (value: SocialSection) => { if (value === section) return; router.setParams({ tab: value, eventType: undefined, area: undefined }); setQuery(""); };
  const placeholder = { nearby: "Find tables near you", people: "Find people", tables: "Find tables", plans: "Find my plans" }[section];
  return <Screen title="Social" back={false} header={<BrowseHeader query={query} onChange={setQuery} placeholder={placeholder}
    filter={section === "people" ? { label: "People filters", count: activePeopleFilters(n.filters) ? 1 : 0, onPress: () => openSocial("/filters") } : undefined}
    action={<IconButton label={badge ? `Inbox, ${badge} new` : "Inbox"} icon="chatbubbles-outline" badge={badge} onPress={() => openSocial("/inbox")} />} />}
    floatingAction={member && (section === "tables" || section === "plans" && !plansEmpty) ? <FloatingAddButton label="Start A Table" onPress={() => openSocial("/table/new")} /> : undefined}>
    <IconTabs tabs={socialTabs} value={section} onChange={select} label="Social sections" />
    {section === "tables" ? <TablesTab query={query} /> : <MemberGate returnTo="/social">{section === "nearby" ? <NearbyView query={query} />
      : section === "people" ? <People query={query} /> : <PersonalPlans query={query} onEmpty={setPlansEmpty} />}</MemberGate>}
  </Screen>;
}
const s = StyleSheet.create({ moment: { gap: 10, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 4, paddingVertical: 8 } });
