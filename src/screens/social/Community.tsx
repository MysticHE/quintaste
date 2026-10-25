import { useMemo, useState } from "react";
import { View } from "react-native";
import { IconButton } from "../../components/food/Controls";
import { T, common } from "../../components/ui";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { BrowseHeader } from "../../components/BrowseControls";
import { TopBar, TopTabs } from "../../components/TopTabs";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { MemberGate, MeetGate, useSocialMe } from "../../components/social/SocialState";
import { openSocial } from "../../components/social/Shared";
import { useMeet } from "../../hooks/useMeet";
import { useRemote } from "../../hooks/useRemote";
import { badges as loadBadges } from "../../services/social-api";
import { useT } from "../../i18n";
import { PeopleTab, activePeopleFilters } from "./PeopleTab";
import { DinnersTab } from "./DinnersTab";

export type SocialTab = "people" | "dinners";
const tabKeys = { people: "tabPeople", dinners: "tabDinners" } as const;
const findKeys = { people: "findPeople", dinners: "findDinners" } as const;
/**
 * Links from before 24 Oct 2026 (Nearby, My plans) land on the closest tab; Events and Tables now live in Feeds. Friends left
 * Dining on 25 Oct 2026: requests are on Add friend, chats in Messages and the list behind the profile's Friends count.
 */
export function readTab(tab: string | undefined): SocialTab | "market" | "friends" {
  if (tab === "plans") return "dinners";
  if (tab === "tables" || tab === "events") return "market";
  return tab === "friends" || tab === "dinners" ? tab : "people";
}
const showEvents = () => router.push("/cook?tab=events");

/** Dining, for members aged 21 to 45: People to meet and Dinners. Events and cooking classes are in Feeds. */
export function SocialCommunityScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>(), read = readTab(tab);
  return read === "market" ? <Redirect href="/cook?tab=events" /> : read === "friends" ? <Redirect href="/social/friends" /> : <SocialHome section={read} />;
}
function SocialHome({ section }: { section: SocialTab }) {
  const t = useT("social"), tc = useT("common");
  const [query, setQuery] = useState(""), { network } = useMeet(), { member } = useMember(), me = useSocialMe();
  const counts = useRemote(member && me.data?.standing.canMeet ? "/api/social/badges" : null, loadBadges, 30000).data;
  const select = (value: SocialTab) => { if (value === section) return; router.setParams({ tab: value }); setQuery(""); };
  const tabs = useMemo(() => (Object.keys(tabKeys) as SocialTab[]).map(id => {
    const badge = id === "dinners" ? counts?.dinners ?? 0 : 0;
    return { id, badge, label: t(tabKeys[id]), accessibleLabel: badge ? t("tabBadge", { label: t(tabKeys[id]), n: badge }) : undefined };
  }), [counts, t]);
  // Members outside 21 to 45 see only the notice that points them to Events in Feeds: no search, filters or tabs.
  const outside = me.data?.standing.step === "age";
  return <Screen title={tc("tabSocial")} hideTimers header={<View style={{ gap: 8 }}><View style={[common.row, { gap: 8 }]}>
    <IconButton appearance="plain" icon="chevron-back" label={tc("goBack")} onPress={() => router.canGoBack() ? router.back() : router.replace("/social?tab=dining")} />
    <T variant="subtitle" style={common.flex}>{t(tabKeys[section])}</T></View>
    {!outside && <BrowseHeader query={query} onChange={setQuery} placeholder={t(findKeys[section])}
      filter={section === "people" ? { label: t("peopleFilters"), count: activePeopleFilters(network.filters) ? 1 : 0, onPress: () => openSocial("/filters") } : undefined} />}</View>}>
    {!outside && <TopBar><TopTabs tabs={tabs} value={section} onChange={select} label={t("socialSections")} /></TopBar>}
    <MemberGate returnTo={"/social?tab=" + section}>
      {!me.data && <RemoteStatus remote={me} icon="people-outline" returnTo={"/social?tab=" + section} />}
      <MeetGate data={me.data} onEvents={showEvents}>
        {section === "people" ? <PeopleTab query={query} me={me.data!} /> : <DinnersTab query={query} />}
      </MeetGate>
    </MemberGate>
  </Screen>;
}
