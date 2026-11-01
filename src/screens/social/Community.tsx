import { useState } from "react";
import { View } from "react-native";
import { IconButton } from "../../components/food/Controls";
import { T, common } from "../../components/ui";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { BrowseHeader } from "../../components/BrowseControls";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, MeetGate, useSocialMe } from "../../components/social/SocialState";
import { openSocial } from "../../components/social/Shared";
import { useMeet } from "../../hooks/useMeet";
import { useT } from "../../i18n";
import { PeopleTab, activePeopleFilters } from "./PeopleTab";

/**
 * Links from before 1 Nov 2026 land where their content now lives: Dinners (and the older My plans) in the Social profile's
 * Dining tab, Events and Tables in Feeds, Friends behind the profile's Friends count. Anything else is People.
 */
function readTab(tab: string | undefined): "people" | "dining" | "market" | "friends" {
  if (tab === "plans" || tab === "dinners") return "dining";
  if (tab === "tables" || tab === "events") return "market";
  return tab === "friends" ? tab : "people";
}
const showEvents = () => router.push("/cook?tab=events");

/** People to meet, for members aged 21 to 45. Every dinner lives in the Social profile's Dining tab (owner, 1 Nov 2026). */
export function SocialCommunityScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>(), read = readTab(tab);
  return read === "market" ? <Redirect href="/cook?tab=events" /> : read === "friends" ? <Redirect href="/social/friends" />
    : read === "dining" ? <Redirect href="/social?tab=dining" /> : <PeopleScreen />;
}
function PeopleScreen() {
  const t = useT("social"), tc = useT("common"), [query, setQuery] = useState(""), { network } = useMeet(), me = useSocialMe();
  // Members outside 21 to 45 see only the notice that points them to Events in Feeds: no search or filters.
  const outside = me.data?.standing.step === "age";
  return <Screen title={t("tabPeople")} header={<View style={{ gap: 8 }}><View style={[common.row, { gap: 8 }]}>
    <IconButton appearance="plain" icon="chevron-back" label={tc("goBack")} onPress={() => router.canGoBack() ? router.back() : router.replace("/social?tab=dining")} />
    <T variant="subtitle" style={common.flex} accessibilityRole="header">{t("tabPeople")}</T></View>
    {!outside && <BrowseHeader query={query} onChange={setQuery} placeholder={t("findPeople")}
      filter={{ label: t("peopleFilters"), count: activePeopleFilters(network.filters) ? 1 : 0, onPress: () => openSocial("/filters") }} />}</View>}>
    <MemberGate returnTo="/social/community">
      {!me.data && <RemoteStatus remote={me} icon="people-outline" returnTo="/social/community" />}
      <MeetGate data={me.data} onEvents={showEvents}><PeopleTab query={query} me={me.data!} /></MeetGate>
    </MemberGate>
  </Screen>;
}
