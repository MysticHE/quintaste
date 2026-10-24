import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "../../components/Screen";
import { T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { DinnerSummary } from "../../components/social/DiningOverview";
import { SocialGate, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { ChatThread, useLineText } from "../../components/social/ChatThread";
import { AnswerButtons } from "../../components/social/DinnerParts";
import { FlagSheet } from "../../components/social/PersonSheets";
import { Avatar } from "../../components/social/SocialPhoto";
import { openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { chat, chatKey, dinners, person, sendChat } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { PersonPage, SocialMe } from "../../types/community";

/** Why Invite is not offered, in plain words; null when it is. */
function useInviteBlock() {
  const t = useT("social");
  return (p: PersonPage | undefined, me: SocialMe | undefined) => !p || !me ? null : p.canInvite ? null
    : !me.standing.canMeet ? t("codeVerify") : me.standing.pausedUntil ? t("codePaused") : p.openInvite ? t("inviteWaiting")
    : me.standing.gender && p.gender && me.standing.gender === p.gender ? t("codeSameGender") : t("codeThem", { name: p.firstName });
}
/** The open invite or next dinner with this friend, pinned above the chat, with Accept / Suggest / Decline when it waits on you. */
function DinnerBar({ friendId }: { friendId: string }) {
  const remote = useRemote("/api/social/dinners", dinners), list = remote.data?.upcoming ?? [];
  const current = list.find(d => d.withId === friendId && d.status === "invited") ?? list.find(d => d.withId === friendId && d.status === "accepted" && !d.past);
  if (!current) return null;
  return <View style={{ gap: 8 }}>
    <DinnerSummary dinner={current} compact />
    {current.status === "invited" && current.yourTurn && <AnswerButtons dinner={current} onDone={remote.refresh} />}
  </View>;
}
/** A chat with one friend. Chat any time; Invite is offered for friends of the opposite gender when both of you can meet. */
export function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), describe = useLineText();
  const me = useSocialMe().data, profile = useRemote(id ? "/api/social/people/" + id : null, signal => person(id, signal)), p = profile.data;
  const lines = useRemote(id ? chatKey(id) : null, signal => chat(id, signal), 5000), [flag, setFlag] = useState(false), blocked = useInviteBlock()(p, me);
  const newest = lines.data?.items.at(-1)?.id;
  useEffect(() => { if (newest) invalidate("/api/social/badges", "/api/social/friends"); }, [newest]);
  const send = async (text: string) => {
    try { await sendChat(id, text); lines.refresh(); return true; }
    catch (failure) { setNotice({ text: problem(failure, p?.firstName), error: true }); return false; }
  };
  const invite = () => blocked ? setNotice({ text: blocked }) : openSocial("/invite/" + id);
  const name = p?.firstName ?? "", tp = useT("profile");
  const title = p ? <Pressable onPress={() => openSocial("/person/" + id)} accessibilityRole="button" accessibilityLabel={t("openPerson", { name })} style={[common.row, { gap: 8, flex: 1, minWidth: 0 }]}>
    <Avatar uri={p.photos[0]?.thumb} name={name} size={36} /><View style={{ flex: 1 }}><T variant="subtitle" numberOfLines={1}>{name}</T><T variant="caption" muted>{tp("friend")}</T></View></Pressable> : null;
  return <Screen hideTimers backTo="/messages" title={title ? undefined : name} fill titleAccessory={title} headerAction={p ? <View style={[common.row, { gap: 6 }]}>
      <IconButton label={t("inviteToDinner")} icon="restaurant-outline" onPress={invite} />
      <IconButton label={t("flagLabel", { name })} icon="flag-outline" onPress={() => setFlag(true)} /></View> : undefined}>
    <SocialGate returnTo={"/social/chat/" + id}>
      <RemoteStatus remote={lines} icon="chatbubbles-outline" returnTo="/social?tab=friends" missing={t("profileUnavailable")} />
      {lines.data && <ChatThread lines={lines.data.items} name={name} describe={line => describe(line, name)} onSend={send} empty={t("chatEmpty", { name })}
        placeholder={tp("messagePerson", { name })} top={<DinnerBar friendId={id} />} disabled={!me?.standing.canMeet} />}
      {p && <FlagSheet person={p} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
    </SocialGate>
  </Screen>;
}
