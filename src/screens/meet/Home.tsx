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
import { useLanguage, useT } from "../../i18n";
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
  const { network: n, commit } = useMeet(), now = useMinuteClock(), moment = lunarMoment(now), { theme } = usePreferences(), t = useT("social");
  if (!moment || n.dismissedMoment === moment.day) return null;
  const name = t("optLunar", { value: moment.label });
  const on = n.filters.diets.includes("Vegetarian"), others = n.filters.diets.filter(d => d !== "Vegetarian");
  // Observance days are the community's own calendar: a banner with a switch, not another filter chip.
  return <View style={[common.row, s.moment, { backgroundColor: theme.successSoft, borderColor: theme.border }]}>
    <Icon name="leaf" size={20} color={theme.success} />
    <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold}>{name}</T><T variant="small" muted>{t("momentNote")}</T></View>
    <ThemedSwitch label={t("momentSwitch", { name })} value={on} onChange={value => void commit({ type: "filters", filters: { ...n.filters, diets: value ? [...others, "Vegetarian"] : others } })} />
    <IconButton label={t("momentHide", { name })} icon="close" onPress={() => void commit({ type: "dismiss-moment", day: moment.day })} />
  </View>;
}
/** People cards sorted by how much you have in common; Invite opens a plan for that person. */
function People({ query }: { query: string }) {
  const { network: n, commit } = useMeet(), mine = useSocialMe().data?.profile, [inviting, setInviting] = useState<{ person: Person; kaki: boolean } | null>(null);
  const t = useT("social"), language = useLanguage();
  const search = useDebounced(query), key = peopleKey(search, n.filters), remote = useRemote(key, signal => people(key, signal));
  const filtered = activePeopleFilters(n.filters) || !!search.trim();
  const sorted = useMemo(() => (remote.data?.items ?? []).map(person => ({ person, shared: inCommon(mine, person, language) }))
    .sort((a, b) => b.shared.length - a.shared.length), [remote.data, mine, language]);
  const invite = (person: Person, kaki = false) => mine && profileState(mine).id === "open" ? setInviting({ person, kaki }) : openSocial("/profile");
  return <>
    {mine && profileState(mine).id !== "open" && <ListGroup><ProfileRow profile={mine} /></ListGroup>}
    <MomentChip />
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" />
    {remote.data && (sorted.length ? sorted.map(({ person, shared }) => <PersonCard key={person.id} person={person} common={shared}
      onInvite={() => invite(person)} onKaki={() => invite(person, true)} />)
      : filtered ? <EmptyState title={t("peopleNoneFiltered")} text="" action={activePeopleFilters(n.filters) ? t("clearFilters") : undefined}
        onPress={() => void commit({ type: "filters", filters: defaultMeetFilters() })} />
      : <FirstRunState icon="people-outline" title={t("peopleNoneTitle")} text={t("peopleNoneText")}
        action={{ label: t("openMyProfile"), icon: "person-outline", onPress: () => openSocial("/profile") }} />)}
    {inviting && mine && <InviteSheet person={inviting.person} me={mine} pickKaki={inviting.kaki} visible onClose={() => setInviting(null)} />}
  </>;
}
/** Tables first; gatherings, local events, classes and home dining sit beside them. */
function TablesTab({ query }: { query: string }) {
  const { eventType, area } = useLocalSearchParams<{ eventType?: string; area?: string }>();
  const type = eventTypes.find(value => value === eventType) ?? "Tables", t = useT("social");
  const options = useMemo(() => eventTypeOptions.map(option => ({ ...option, label: t("optEventType", { value: option.label }) })), [t]);
  return <>
    <TypePills options={options} value={type} onChange={label => router.setParams({ eventType: label })} />
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
const tabKey = { nearby: "tabNearby", people: "tabPeople", tables: "tabTables", plans: "tabPlans" } as const;
export function MeetHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const section = readSection(tab);
  const [query, setQuery] = useState(""), [plansEmpty, setPlansEmpty] = useState(false);
  const { network: n } = useMeet(), { member } = useMember(), t = useT("social"), tc = useT("common");
  const counts = useRemote(member ? "/api/social/unread" : null, unread, 30000).data, badge = (counts?.invitations ?? 0) + (counts?.messages ?? 0);
  useWelcome(section);
  const select = (value: SocialSection) => { if (value === section) return; router.setParams({ tab: value, eventType: undefined, area: undefined }); setQuery(""); };
  const placeholder = t(({ nearby: "findNearby", people: "findPeople", tables: "findTables", plans: "findPlans" } as const)[section]);
  const tabs = useMemo(() => socialTabs.map(tab => ({ ...tab, label: t(tabKey[tab.id]) })), [t]);
  return <Screen title={tc("tabSocial")} back={false} header={<BrowseHeader query={query} onChange={setQuery} placeholder={placeholder}
    filter={section === "people" ? { label: t("peopleFilters"), count: activePeopleFilters(n.filters) ? 1 : 0, onPress: () => openSocial("/filters") } : undefined}
    action={<IconButton label={badge ? t("inboxNew", { n: badge }) : t("inbox")} icon="chatbubbles-outline" badge={badge} onPress={() => openSocial("/inbox")} />} />}
    floatingAction={member && (section === "tables" || section === "plans" && !plansEmpty) ? <FloatingAddButton label={t("startTable")} onPress={() => openSocial("/table/new")} /> : undefined}>
    <IconTabs tabs={tabs} value={section} onChange={select} label={t("socialSections")} />
    {section === "tables" ? <TablesTab query={query} /> : <MemberGate returnTo="/social">{section === "nearby" ? <NearbyView query={query} />
      : section === "people" ? <People query={query} /> : <PersonalPlans query={query} onEmpty={setPlansEmpty} />}</MemberGate>}
  </Screen>;
}
const s = StyleSheet.create({ moment: { gap: 10, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 4, paddingVertical: 8 } });
