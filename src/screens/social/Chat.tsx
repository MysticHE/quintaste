import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "../../components/Screen";
import { T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { DinnerSummary } from "../../components/social/DiningOverview";
import { MemberGate, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { ChatThread, useLineText } from "../../components/social/ChatThread";
import { GiftLine, GiftSheet, useGiftCatalog, useGiftOpener } from "../../components/collection/Gifts";
import { BorderFrame } from "../../components/collection/Glint";
import { borderArt } from "../../config/collection";
import { AnswerButtons, LateChips, isDayOf } from "../../components/social/DinnerParts";
import { useMinuteClock } from "../../components/food/Timers";
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
/**
 * Today's dinner, else the open invite, else the next dinner with this friend, pinned above the chat: Running late on the day,
 * Accept / Suggest / Decline when an invite waits on you.
 */
function DinnerBar({ friendId }: { friendId: string }) {
  const canMeet = !!useSocialMe().data?.standing.canMeet, remote = useRemote(canMeet ? "/api/social/dinners" : null, dinners), now = useMinuteClock();
  const list = remote.data ? [...remote.data.upcoming, ...remote.data.past] : [], mine = list.filter(d => d.withId === friendId);
  // Tonight's dinner comes first: it is the one that can be missed.
  const current = mine.find(d => isDayOf(d, now)) ?? mine.find(d => d.status === "invited") ?? mine.find(d => d.status === "accepted" && !d.past);
  if (!current) return null;
  return <View style={{ gap: 8 }}>
    <DinnerSummary dinner={current} compact />
    {current.status === "invited" && current.yourTurn && <AnswerButtons dinner={current} onDone={remote.refresh} />}
    {isDayOf(current, now) && <LateChips dinner={current} compact />}
  </View>;
}
/** A chat with one friend, at any age (owner, 25 Oct 2026). Invite is offered for friends of the opposite gender when both of you can use Dining. */
export function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), describe = useLineText();
  const me = useSocialMe().data, profile = useRemote(id ? "/api/social/people/" + id : null, signal => person(id, signal)), p = profile.data;
  const lines = useRemote(id ? chatKey(id) : null, signal => chat(id, signal), 5000), [flag, setFlag] = useState(false), blocked = useInviteBlock()(p, me);
  const gifts = useGiftCatalog(!!me?.hasProfile).data, [giving, setGiving] = useState(false), opener = useGiftOpener(gifts?.catalog);
  const newest = lines.data?.items.at(-1)?.id;
  useEffect(() => { if (newest) invalidate("/api/social/badges", "/api/social/friends"); }, [newest]);
  const send = async (text: string) => {
    try { await sendChat(id, text); lines.refresh(); return true; }
    catch (failure) { setNotice({ text: problem(failure, p?.firstName), error: true }); return false; }
  };
  const invite = () => blocked ? setNotice({ text: blocked }) : openSocial("/invite/" + id);
  const name = p?.firstName ?? "", tp = useT("profile"), tg = useT("collection");
  const title = p ? <Pressable onPress={() => openSocial("/person/" + id)} accessibilityRole="button" accessibilityLabel={t("openPerson", { name })} style={[common.row, { gap: 8, flex: 1, minWidth: 0 }]}>
    <BorderFrame art={p.worn?.border ? borderArt(p.worn.border) : undefined} size={36}><Avatar uri={p.photos[0]?.thumb} size={36} /></BorderFrame><View style={{ flex: 1 }}><T variant="subtitle" numberOfLines={1}>{name}</T><T variant="caption" muted>{tp("friend")}</T></View></Pressable> : null;
  return <Screen hideTimers backTo="/messages" title={title ? undefined : name} fill titleAccessory={title} headerAction={p ? <View style={[common.row, { gap: 4 }]}>
      <IconButton appearance="plain" label={t("inviteToDinner")} icon="restaurant-outline" onPress={invite} />
      <IconButton appearance="plain" label={t("flagLabel", { name })} icon="flag-outline" onPress={() => setFlag(true)} /></View> : undefined}>
    <MemberGate returnTo={"/social/chat/" + id}>
      <RemoteStatus remote={lines} icon="chatbubbles-outline" returnTo="/social/friends" missing={t("profileUnavailable")} />
      {lines.data && <ChatThread lines={lines.data.items} name={name} describe={line => describe(line, name)} onSend={send} empty={t("chatEmpty", { name })}
        placeholder={tp("messagePerson", { name })} top={<DinnerBar friendId={id} />}
        composerLeading={gifts && p ? <IconButton label={tg("sendGift")} icon="gift-outline" onPress={() => setGiving(true)} /> : undefined}
        renderLine={line => line.kind === "gift" ? <GiftLine key={line.id} gift={line.gift} mine={line.mine} onPress={() => line.gift && opener.show({ ...line.gift, fromId: id }, name, line.mine)} /> : null} />}
      {gifts && p && <GiftSheet visible={giving} onClose={() => setGiving(false)} to={id} data={gifts} />}
      {opener.opening}
      {p && <FlagSheet person={p} hasPhoto={!!p.photos.length} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
    </MemberGate>
  </Screen>;
}
