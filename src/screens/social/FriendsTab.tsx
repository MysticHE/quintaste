import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { FirstRunState } from "../../components/BrowseControls";
import { RemoteStatus } from "../../components/CommunityGate";
import { IconButton } from "../../components/food/Controls";
import { ListGroup, ListItem } from "../../components/GroupedList";
import { T, common } from "../../components/ui";
import { Avatar } from "../../components/social/SocialPhoto";
import { StandingRow, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { useLineText } from "../../components/social/ChatThread";
import { openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { acceptRequest, cancelRequest, declineRequest, friends as loadFriends } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { sgDateTile, sgDateTimeText } from "../../utils/sg-datetime";
import { useMinuteClock } from "../../components/food/Timers";
import type { Friend, FriendRequest } from "../../types/community";

/** The time for today's lines, otherwise the short date ("24 Oct", "10月24日"). */
function when(at: string, now: number, language: "en" | "zh") {
  const text = sgDateTimeText(Date.parse(at)), tile = sgDateTile(text, language);
  if (!tile) return "";
  return text.slice(0, 10) === sgDateTimeText(now).slice(0, 10) ? tile.time : language === "zh" ? tile.month + tile.day + "日" : tile.day + " " + tile.month;
}
function RequestRow({ request: r, received, onDone }: { request: FriendRequest; received: boolean; onDone: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); invalidate("/api/social/friends", "/api/social/badges"); onDone(); }
    catch (failure) { setNotice({ text: problem(failure, r.firstName), error: true }); }
    finally { setBusy(false); }
  };
  return <ListItem title={r.firstName} subtitle={received ? r.note || undefined : t("waiting")} wrap leading={<Avatar uri={r.photo} name={r.firstName} size={48} />} onPress={() => openSocial("/person/" + r.userId)}
    trailing={received ? <View style={[common.row, { gap: 4 }]}>
      <IconButton label={t("declineNamed", { name: r.firstName })} icon="close" disabled={busy} onPress={() => void run(() => declineRequest(r.id))} />
      <IconButton label={t("acceptNamed", { name: r.firstName })} icon="checkmark" selected disabled={busy} onPress={() => void run(() => acceptRequest(r.id))} />
    </View> : <IconButton label={t("cancelNamed", { name: r.firstName })} icon="close" disabled={busy} onPress={() => void run(() => cancelRequest(r.id))} />} />;
}
function FriendRow({ friend: f }: { friend: Friend }) {
  const t = useT("social"), { theme } = usePreferences(), language = useLanguage(), line = useLineText(), now = useMinuteClock();
  const preview = f.last ? (f.last.kind === "text" && f.last.mine ? t("youSaid", { text: f.last.body }) : line(f.last, f.firstName)) : t("eventFriends");
  return <ListItem title={f.firstName} subtitle={preview} leading={<Avatar uri={f.photo} name={f.firstName} size={48} />}
    label={f.unread ? t("unreadNamed", { name: f.firstName, n: f.unread }) + ", " + preview : f.firstName + ", " + preview}
    trailing={<View style={{ alignItems: "flex-end", gap: 4 }}>
      <T variant="caption" muted>{when(f.last?.at ?? f.updatedAt, now, language)}</T>
      {f.unread > 0 && <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
        <T variant="caption" color={theme.actionForeground} style={common.bold}>{f.unread > 99 ? "99+" : f.unread}</T></View>}
    </View>} onPress={() => openSocial("/chat/" + f.id)} />;
}
/** Friend requests (received, then sent) and chats with friends, newest first. Chat any time once friends. */
export function FriendsTab({ query }: { query: string }) {
  const t = useT("social"), me = useSocialMe().data, remote = useRemote("/api/social/friends", loadFriends, 15000), q = useDebounced(query).trim().toLowerCase();
  const has = (name: string) => !q || name.toLowerCase().includes(q), d = remote.data;
  const received = d?.received.filter(r => has(r.firstName)) ?? [], sent = d?.sent.filter(r => has(r.firstName)) ?? [], chats = d?.friends.filter(f => has(f.firstName)) ?? [];
  return <>
    {me && !me.standing.canMeet && <StandingRow data={me} />}
    <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/social?tab=friends" />
    {!!received.length && <ListGroup title={t("requestsHeading")} inset={72}>{received.map(r => <RequestRow key={r.id} request={r} received onDone={remote.refresh} />)}</ListGroup>}
    {!!chats.length && <ListGroup title={t("chatsHeading")} inset={72}>{chats.map(f => <FriendRow key={f.id} friend={f} />)}</ListGroup>}
    {!!sent.length && <ListGroup title={t("sentHeading")} inset={72}>{sent.map(r => <RequestRow key={r.id} request={r} received={false} onDone={remote.refresh} />)}</ListGroup>}
    {d && !received.length && !chats.length && !sent.length && (q ? <T muted style={{ textAlign: "center" }}>{t("noMatchingFriends")}</T>
      : <FirstRunState icon="chatbubbles-outline" title={t("friendsNoneTitle")} text={t("friendsNoneText")}
        action={{ label: t("findPeopleAction"), icon: "people-outline", onPress: () => router.setParams({ tab: "people" }) }} />)}
  </>;
}
