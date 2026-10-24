import { useMemo, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { BrowseHeader, IconTabs, type IconTab } from "../../components/BrowseControls";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { MemberGate, MeetGate, useSocialMe } from "../../components/social/SocialState";
import { openSocial } from "../../components/social/Shared";
import { useMeet } from "../../hooks/useMeet";
import { useRemote } from "../../hooks/useRemote";
import { badges as loadBadges } from "../../services/social-api";
import { useT } from "../../i18n";
import type { MeetFilters } from "../../types/meet";
import { PeopleTab } from "./PeopleTab";
import { FriendsTab } from "./FriendsTab";
import { DinnersTab } from "./DinnersTab";

export type SocialTab = "people" | "friends" | "dinners";
const tabIcons: Record<SocialTab, [IconTab<SocialTab>["icon"], IconTab<SocialTab>["activeIcon"]]> = {
  people: ["people-outline", "people"], friends: ["chatbubbles-outline", "chatbubbles"], dinners: ["restaurant-outline", "restaurant"] };
const tabKeys = { people: "tabPeople", friends: "tabFriends", dinners: "tabDinners" } as const;
const findKeys = { people: "findPeople", friends: "findFriends", dinners: "findDinners" } as const;
/** Links from before 24 Oct 2026 (Nearby, My plans) land on the closest tab; Events and Tables now live in Market. */
export function readTab(tab: string | undefined): SocialTab | "market" {
  if (tab === "plans") return "dinners";
  if (tab === "tables" || tab === "events") return "market";
  return tab === "friends" || tab === "dinners" ? tab : "people";
}
const showEvents = () => router.push("/market?tab=events");
export const activePeopleFilters = (f: MeetFilters) => f.diets.length > 0 || f.ages.length > 0 || f.languages.length > 0 || f.hobbies.length > 0 || f.km > 0;

/** Social, for members aged 21 to 45: People to meet, Friends (requests and chats) and Dinners. Events and cooking classes are in Market. */
export function SocialHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>(), read = readTab(tab);
  return read === "market" ? <Redirect href="/market?tab=events" /> : <SocialHome section={read} />;
}
function SocialHome({ section }: { section: SocialTab }) {
  const t = useT("social"), tc = useT("common");
  const [query, setQuery] = useState(""), { network } = useMeet(), { member } = useMember(), me = useSocialMe();
  const counts = useRemote(member && me.data?.standing.canMeet ? "/api/social/badges" : null, loadBadges, 30000).data;
  const select = (value: SocialTab) => { if (value === section) return; router.setParams({ tab: value }); setQuery(""); };
  const tabs = useMemo(() => (Object.keys(tabKeys) as SocialTab[]).map(id => {
    const badge = id === "friends" ? (counts?.requests ?? 0) + (counts?.messages ?? 0) : id === "dinners" ? counts?.dinners ?? 0 : 0;
    return { id, icon: tabIcons[id][0], activeIcon: tabIcons[id][1], badge, label: badge ? t("tabBadge", { label: t(tabKeys[id]), n: badge }) : t(tabKeys[id]) };
  }), [counts, t]);
  // Members outside 21 to 45 see only the notice that points them to Events in Market: no search, filters or tabs.
  const outside = me.data?.standing.step === "age";
  return <Screen title={tc("tabSocial")} back={false} header={outside ? undefined : <BrowseHeader query={query} onChange={setQuery} placeholder={t(findKeys[section])}
    filter={section === "people" ? { label: t("peopleFilters"), count: activePeopleFilters(network.filters) ? 1 : 0, onPress: () => openSocial("/filters") } : undefined} />}>
    {!outside && <IconTabs tabs={tabs} value={section} onChange={select} label={t("socialSections")} />}
    <MemberGate returnTo={"/social?tab=" + section}>
      {!me.data && <RemoteStatus remote={me} icon="people-outline" returnTo={"/social?tab=" + section} />}
      <MeetGate data={me.data} onEvents={showEvents}>
        {section === "people" ? <PeopleTab query={query} me={me.data!} /> : section === "friends" ? <FriendsTab query={query} /> : <DinnersTab query={query} />}
      </MeetGate>
    </MemberGate>
  </Screen>;
}
