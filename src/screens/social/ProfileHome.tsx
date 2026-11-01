import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useDeferredValue, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Icon, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { IconTabs } from "../../components/BrowseControls";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, MeetGate, useSocialMe } from "../../components/social/SocialState";
import { ChoiceChips, MessagesButton } from "../../components/social/ProfileControls";
import { MyPostGrid, SavedGrid, type ContentKind } from "../../components/social/ProfileGrid";
import { ProfileSummary } from "../../components/social/ProfileSummary";
import { DiningOverview } from "../../components/social/DiningOverview";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { useInbox } from "../../components/InboxCounts";
import { useAuth } from "../../state/Auth";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe } from "../../types/community";

type ProfileTab = "posts" | "saved" | "dining";
// No "All" chip (owner, 25 Oct 2026): nothing selected shows everything, and tapping the selected kind clears it.
const postKinds = ["recipes", "market", "events"] as const, savedKinds = ["places", "recipes", "market", "events"] as const;

export function SocialHomeScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  if (tab === "friends") return <Redirect href="/social/friends" />;
  if (tab && ["people", "dinners", "plans"].includes(tab)) return <Redirect href={{ pathname: "/social/community", params: { tab } }} />;
  if (tab === "events" || tab === "tables") return <Redirect href="/cook?tab=events" />;
  return <ProfileHome tab={tab === "saved" || tab === "dining" ? tab : "posts"} />;
}
/** Where the pencil goes: My Profile, where every member edits photos, basics and About me (owner, 25 Oct 2026). */
const editTarget = "/social/profile";
function ProfileHome({ tab }: { tab: ProfileTab }) {
  const t = useT("profile"), { user } = useAuth(), me = useSocialMe(), inbox = useInbox();
  const [kind, setKind] = useState<ContentKind>("all");
  const data = me.data, name = data?.profile.firstName || user?.name || t("profileFallback");
  const select = (next: ProfileTab) => { router.setParams({ tab: next }); setKind("all"); };
  // The tab moves at once; its grid renders just after, so the tap is never held up by building the grid.
  const shown = useDeferredValue(tab);
  const kinds = (shown === "saved" ? savedKinds : postKinds).map(id => ({ id, label: t(id) }));
  const dinners = inbox?.dinners ?? 0, orders = inbox?.orders ?? 0;
  return <Screen back={false} header={<TopRow name={name} data={data} />}>
    <MemberGate returnTo="/social">
      <ProfileSummary data={data} onEdit={() => router.push(editTarget)} onPosts={() => select("posts")} />
      <View testID="social-profile-tabs"><IconTabs label={t("profile")} value={tab} onChange={select} tabs={[
        { id: "posts", label: t("posts"), icon: "grid-outline", activeIcon: "grid" },
        { id: "saved", label: t("saved"), icon: "bookmark-outline", activeIcon: "bookmark" },
        // Dinner invites to answer and dinners to tell us about wait on Dining; friend requests wait on Add friend.
        { id: "dining", label: t("dining"), icon: "restaurant-outline", activeIcon: "restaurant", badge: dinners },
      ]} /></View>
      {shown === "dining" ? <><RemoteStatus remote={me} icon="restaurant-outline" returnTo="/social?tab=dining" /><MeetGate data={data} onEvents={() => router.push("/cook?tab=events")}><DiningOverview /></MeetGate></> : <>
        <ChoiceChips clearable label={t(shown)} options={kinds} value={kind} onChange={next => setKind(next === kind ? "all" : next)} />
        {shown === "posts" ? <>
          {/* Your shop and classes open from your own Market items and events (owner, 25 Oct 2026); new orders also arrive in Messages. */}
          {kind === "market" && <ListGroup><ListItem title={t("shop")} leading={<RowIcon name="storefront-outline" />} onPress={() => router.push("/market?tab=shop")}
            badge={orders ? <StatusPill label={t("newCount", { n: orders })} tone="accent" /> : undefined} /></ListGroup>}
          {kind === "events" && <ListGroup><ListItem title={t("classes")} leading={<RowIcon name="school-outline" />} onPress={() => router.push("/market/teaching")} /></ListGroup>}
          <MyPostGrid kind={kind} />
        </> : <SavedGrid key={kind} kind={kind} query="" />}
      </>}
    </MemberGate>
  </Screen>;
}
/**
 * Name, tick and @handle on the left; Add friend (friend requests), Messages and Settings on the right. The Messages count is
 * chats that need the member: unread ones, plus a seller's chat with a new order not yet answered (server/community/inbox.mjs).
 */
function TopRow({ name, data }: { name: string; data: SocialMe | undefined }) {
  const t = useT("profile"), tc = useT("collection"), { theme } = usePreferences(), inbox = useInbox(), requests = inbox?.requests ?? 0, giftCount = (inbox?.gifts ?? 0) + (inbox?.giftNews ?? 0);
  const verified = !!data?.standing.verified;
  return <View testID="social-profile-header" style={[common.row, { minHeight: 56, gap: 4 }]}>
    <View style={[common.flex, { minWidth: 0 }]} accessible accessibilityRole="header" accessibilityLabel={[name, verified ? t("verifiedTick") : "", data?.handle ? "@" + data.handle : ""].filter(Boolean).join(", ")}>
      <View style={[common.row, { gap: 4 }]}><T variant="title" numberOfLines={1} style={[common.bold, { flexShrink: 1 }]}>{name}</T>
        {verified && <Icon name="checkmark-circle" size={18} color={theme.success} />}</View>
      {!!data?.handle && <T variant="small" muted numberOfLines={1}>{"@" + data.handle}</T>}
    </View>
    {!!data && <IconButton appearance="plain" icon="person-add-outline" badge={requests} label={requests ? t("addFriendWaiting", { n: requests }) : t("addFriend")}
      onPress={() => router.push("/social/add-friend")} />}
    {data?.worn && <IconButton appearance="plain" icon="trophy-outline" badge={giftCount}
      label={giftCount ? tc("giftsWaiting", { n: giftCount }) : tc("openCollection")} onPress={() => router.push("/social/collection")} />}
    <MessagesButton unread={inbox?.messages ?? 0} />
    {/* The full Me menu (Saved, Food choices, Location, Appearance, Privacy, Help, sign-out); this is its only entry point. */}
    <IconButton appearance="plain" icon="settings-outline" label={t("settings")} onPress={() => router.push({ pathname: "/account", params: { returnTo: "/social" } })} />
  </View>;
}
