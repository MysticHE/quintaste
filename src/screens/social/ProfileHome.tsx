import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, SearchField } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, MeetGate } from "../../components/social/SocialState";
import { Avatar } from "../../components/social/SocialPhoto";
import { ProfileTabs, MessagesButton, PrivateSaves } from "../../components/social/ProfileControls";
import { MyPostGrid, SavedGrid, type ContentKind } from "../../components/social/ProfileGrid";
import { DiningOverview } from "../../components/social/DiningOverview";
import { Sheet } from "../../components/social/Sheet";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { useCreateRecipe } from "../food/MyRecipes";
import { useMessages } from "../../hooks/useMessages";
import { useAuth } from "../../state/Auth";
import { useT } from "../../i18n";

export function SocialHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  if (tab && ["people", "friends", "dinners", "plans"].includes(tab)) return <Redirect href={{ pathname: "/social/community", params: { tab } }} />;
  if (tab === "events" || tab === "tables") return <Redirect href="/cook?tab=events" />;
  return <ProfileHome tab={tab === "saved" || tab === "dining" ? tab : "posts"} />;
}
function ProfileHome({ tab }: { tab: "posts" | "saved" | "dining" }) {
  const t = useT("profile"), tf = useT("feeds"), { user } = useAuth(), { me, unread } = useMessages();
  const [kind, setKind] = useState<ContentKind>("all"), [query, setQuery] = useState(""), [add, setAdd] = useState(false), { create, readable } = useCreateRecipe();
  const data = me.data, name = data?.profile.firstName || user?.name || t("profileFallback"), bio = data?.profile.about || user?.bio;
  const edit = () => router.push(data?.standing.step === "age" ? "/settings" : !data || ["photos", "basics"].includes(data.standing.step) ? "/social/setup" : "/social/profile");
  const select = (next: typeof tab) => { router.setParams({ tab: next }); setKind("all"); setQuery(""); };
  return <Screen back={false} hideTimers header={<View style={[common.row, { minHeight: 48 }]}>
    <T style={[common.bold, common.flex]} numberOfLines={1}>{user?.username ? "@" + user.username : name}</T><MessagesButton unread={unread} />
    <IconButton appearance="plain" icon="settings-outline" label={t("settings")} onPress={() => router.push("/settings")} />
  </View>}>
    <MemberGate returnTo="/social">
      <View testID="social-profile-header" style={{ alignItems: "center", gap: 6, paddingTop: 4, paddingBottom: 10 }}>
        <View><Avatar uri={data?.photos[0]?.thumb} name={name} size={80} /><View style={{ position: "absolute", bottom: -6, right: -14 }}><IconButton icon="create-outline" label={t("edit")} onPress={edit} /></View></View>
        <T variant="title" style={[common.bold, { textAlign: "center", marginTop: 6 }]}>{name}</T>
        {!!data?.profile.area && <View style={[common.row, { gap: 4 }]}><Icon name="location-outline" size={15} /><T variant="small" muted>{data.profile.area}</T></View>}
        {!!bio && <T variant="small" style={{ textAlign: "center", maxWidth: 320 }} numberOfLines={3}>{bio}</T>}
      </View>
      <ProfileTabs solid label={t("profile")} options={(["posts", "saved", "dining"] as const).map(id => ({ id, label: t(id) }))} value={tab} onChange={select} />
      {tab === "dining" ? <><RemoteStatus remote={me} icon="restaurant-outline" returnTo="/social?tab=dining" /><MeetGate data={data} onEvents={() => router.push("/cook?tab=events")}><DiningOverview /></MeetGate></> : <>
        <View style={[common.row, { gap: 4 }]}><View style={[common.flex, { minWidth: 0 }]}><ProfileTabs label={t(tab)} options={(["all", "recipes", "market", "events"] as const).map(id => ({ id, label: t(id) }))} value={kind} onChange={setKind} /></View>
          {tab === "posts" && <Button label={t("newPost")} icon="add" variant="secondary" onPress={() => setAdd(true)} />}</View>
        {tab === "posts" ? <MyPostGrid kind={kind} />
          : <><SearchField value={query} onChange={setQuery} placeholder={t("searchSaved")} /><PrivateSaves /><SavedGrid key={kind} kind={kind} query={query} />
            <Button label={t("savedPlaces")} icon="location-outline" variant="link" onPress={() => router.push("/saved")} /></>}
      </>}
      <ListGroup title={t("manage")}><ListItem title={t("orders")} leading={<RowIcon name="receipt-outline" />} onPress={() => router.push("/market/orders")} />
        <ListItem title={t("shop")} leading={<RowIcon name="storefront-outline" />} onPress={() => router.push("/market?tab=shop")} />
        <ListItem title={t("classes")} leading={<RowIcon name="school-outline" />} onPress={() => router.push("/market/teaching")} /></ListGroup>
      <Sheet visible={add} onClose={() => setAdd(false)} title={t("newPost")}>
        <Button label={tf("shareRecipe")} icon="book-outline" variant="secondary" disabled={!readable} onPress={() => { setAdd(false); void create(); }} />
        <Button label={tf("listItem")} icon="pricetag-outline" variant="secondary" onPress={() => { setAdd(false); router.push("/market/new"); }} />
        <Button label={tf("createEvent")} icon="calendar-outline" variant="secondary" onPress={() => { setAdd(false); router.push("/market/teaching?create=1"); }} />
      </Sheet>
    </MemberGate>
  </Screen>;
}
