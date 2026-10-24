import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, SearchField } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, MeetGate, useSocialMe } from "../../components/social/SocialState";
import { Avatar } from "../../components/social/SocialPhoto";
import { ChoiceChips, MessagesButton, PrivateSaves } from "../../components/social/ProfileControls";
import { MyPostGrid, SavedGrid, type ContentKind } from "../../components/social/ProfileGrid";
import { DiningOverview } from "../../components/social/DiningOverview";
import { AddPostMenu } from "../../components/feeds/AddPostMenu";
import { TopBar, TopTabs } from "../../components/TopTabs";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { useInbox } from "../../components/InboxCounts";
import { useAuth } from "../../state/Auth";
import { useT } from "../../i18n";

type ProfileTab = "posts" | "saved" | "dining";
const postKinds = ["all", "recipes", "market", "events"] as const, savedKinds = ["all", "places", "recipes", "market", "events"] as const;

export function SocialHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  if (tab && ["people", "friends", "dinners", "plans"].includes(tab)) return <Redirect href={{ pathname: "/social/community", params: { tab } }} />;
  if (tab === "events" || tab === "tables") return <Redirect href="/cook?tab=events" />;
  return <ProfileHome tab={tab === "saved" || tab === "dining" ? tab : "posts"} />;
}
function ProfileHome({ tab }: { tab: ProfileTab }) {
  const t = useT("profile"), { user } = useAuth(), me = useSocialMe(), inbox = useInbox();
  const waiting = (inbox?.requests ?? 0) + (inbox?.dinners ?? 0), orders = inbox?.orders ?? 0;
  const [kind, setKind] = useState<ContentKind>("all"), [query, setQuery] = useState("");
  const data = me.data, name = data?.profile.firstName || user?.name || t("profileFallback"), bio = data?.profile.about || user?.bio;
  const edit = () => router.push(data?.standing.step === "age" ? "/settings" : !data || ["photos", "basics"].includes(data.standing.step) ? "/social/setup" : "/social/profile");
  const select = (next: ProfileTab) => { router.setParams({ tab: next }); setKind("all"); setQuery(""); };
  const kinds = (tab === "saved" ? savedKinds : postKinds).map(id => ({ id, label: t(id) }));
  return <Screen back={false} hideTimers header={<View style={[common.row, { minHeight: 48 }]}>
    <T style={[common.bold, common.flex]} numberOfLines={1}>{user?.username ? "@" + user.username : name}</T>
    <AddPostMenu /><MessagesButton unread={inbox?.messages ?? 0} />
    <IconButton appearance="plain" icon="settings-outline" label={t("settings")} onPress={() => router.push("/settings")} />
  </View>}>
    <MemberGate returnTo="/social">
      <View testID="social-profile-header" style={{ alignItems: "center", gap: 6, paddingTop: 4, paddingBottom: 6 }}>
        <View><Avatar uri={data?.photos[0]?.thumb} name={name} size={80} /><View style={{ position: "absolute", bottom: -6, right: -14 }}><IconButton icon="create-outline" label={t("edit")} onPress={edit} /></View></View>
        <T variant="title" style={[common.bold, { textAlign: "center", marginTop: 6 }]}>{name}</T>
        {!!data?.profile.area && <View style={[common.row, { gap: 4 }]}><Icon name="location-outline" size={15} /><T variant="small" muted>{data.profile.area}</T></View>}
        {!!bio && <T variant="small" style={{ textAlign: "center", maxWidth: 320 }} numberOfLines={3}>{bio}</T>}
      </View>
      <TopBar testID="social-profile-tabs"><TopTabs label={t("profile")} value={tab} onChange={select} tabs={(["posts", "saved", "dining"] as const).map(id => {
        // Friend requests and dinner invites wait on Dining.
        const badge = id === "dining" ? waiting : 0;
        return { id, label: t(id), badge, accessibleLabel: badge ? t("waitingBadge", { label: t(id), n: badge }) : undefined };
      })} /></TopBar>
      {tab === "dining" ? <><RemoteStatus remote={me} icon="restaurant-outline" returnTo="/social?tab=dining" /><MeetGate data={data} onEvents={() => router.push("/cook?tab=events")}><DiningOverview /></MeetGate></> : <>
        <ChoiceChips label={t(tab)} options={kinds} value={kind} onChange={setKind} />
        {tab === "posts" ? <>
          <MyPostGrid kind={kind} />
          <ListGroup title={t("manage")}><ListItem title={t("orders")} leading={<RowIcon name="receipt-outline" />} onPress={() => router.push("/market?tab=orders")} />
            <ListItem title={t("shop")} leading={<RowIcon name="storefront-outline" />} onPress={() => router.push("/market?tab=shop")}
              badge={orders ? <StatusPill label={t("newCount", { n: orders })} tone="accent" /> : undefined} />
            <ListItem title={t("classes")} leading={<RowIcon name="school-outline" />} onPress={() => router.push("/market/teaching")} /></ListGroup>
        </> : <>
          <SearchField value={query} onChange={setQuery} placeholder={t("searchSaved")} /><PrivateSaves /><SavedGrid key={kind} kind={kind} query={query} />
          <Button label={t("savedPlaces")} icon="location-outline" variant="link" onPress={() => router.push("/saved")} />
        </>}
      </>}
    </MemberGate>
  </Screen>;
}
