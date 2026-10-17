import { useEffect, useRef } from "react";
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { T, common } from "../../components/ui";
import { ChatBubble, ChatComposer } from "../../components/Chat";
import { IconButton } from "../../components/food/Controls";
import { Action, Confirm, goToPlans, openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { MemberRow } from "../../components/social/GroupTools";
import { SystemLine } from "../../components/social/PlanCard";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { usePreferences } from "../../state/Preferences";
import { group as loadGroup, leave, markRead, respond, sendMessage } from "../../services/social-api";
import { ApiError } from "../../services/community-api";
import { chatOpen, groupName, groupStatus } from "../../utils/meet";
import { formatSgDateTime, formatSgShort } from "../../utils/sg-datetime";
import { conversationStarters } from "../../data/meet";
import type { Group } from "../../types/community";

export function MeetChatScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member ? "/api/social/groups/" + id : null, signal => loadGroup(id, signal), 4000), g = remote.data;
  return <Screen fill title={g ? groupName(g) : "Conversation"} backTo="/social"
    headerAction={g ? <IconButton label="Group Details" icon="people-outline" onPress={() => openSocial("/group/" + id)} /> : undefined}>
    <MemberGate>{g ? <Chat group={g} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/social" missing="Conversation Unavailable" />}</MemberGate>
  </Screen>;
}
const changed = (refresh: () => void) => { refresh(); invalidate("/api/social/groups", "/api/social/unread"); };
/** The introduction opens the thread; messages and system lines follow in time order. */
function Timeline({ group: g }: { group: Group }) {
  const scroll = useRef<ScrollView>(null), atEnd = useRef(true), many = g.size > 2;
  // Follow new content only when the reader is already at the end.
  const track = (e: NativeSyntheticEvent<NativeScrollEvent>) => { const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent; atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 48; };
  return <ScrollView ref={scroll} style={common.flex} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
    onScroll={track} onContentSizeChange={() => { if (atEnd.current) scroll.current?.scrollToEnd({ animated: false }); }}>
    {g.messages?.map((m, index, all) => {
      const named = many && !m.mine && m.kind === "text" && all[index - 1]?.senderId !== m.senderId;
      return <View key={m.id} style={{ gap: 2 }} accessibilityLiveRegion={index === all.length - 1 ? "polite" : "none"}>
        {m.kind === "event" ? <SystemLine message={m} /> : <>
          {named && <T variant="caption" muted>{m.senderName}</T>}
          <ChatBubble mine={m.mine} text={m.body} label={(m.mine ? "You" : m.senderName) + ": " + m.body + ", " + formatSgDateTime(Date.parse(m.createdAt))} />
        </>}
      </View>;
    })}
  </ScrollView>;
}
function PlanBar({ group: g }: { group: Group }) {
  const now = useMinuteClock(), status = groupStatus(g, now), open = () => openSocial("/group/" + g.id);
  return <ListGroup>{g.venue
    ? <ListItem title={g.venue} subtitle={formatSgShort(g.starts)} leading={<RowIcon name="location-outline" />} trailing={<StatusPill label={status.label} tone={status.tone} />} onPress={open} />
    : <ListItem title="Make A Plan" leading={<RowIcon name="add" />} onPress={open} />}</ListGroup>;
}
/** An invitation: who is in the group, then Accept or Decline. */
function Invitation({ group: g, refresh }: { group: Group; refresh: () => void }) {
  const answer = async (accept: boolean) => { await respond(g.id, accept); changed(refresh); if (!accept) goToPlans(); };
  return <>
    <ListGroup title={"Group of " + g.size}>{g.members.map(m => <MemberRow key={m.id} member={m} />)}</ListGroup>
    <View style={common.row}>
      <View style={common.flex}><Action label="Decline" secondary run={() => answer(false)} /></View>
      <View style={common.flex}><Action label="Accept" run={() => answer(true)} /></View>
    </View>
  </>;
}
/** Before anyone accepts, who is invited; after everyone declines or you leave, a way forward. */
function ChatState({ group: g, refresh }: { group: Group; refresh: () => void }) {
  if (g.myStatus === "left" || g.myStatus === "declined") return <ListGroup>
    <ListItem title={g.myStatus === "left" ? "You left this group" : "You declined"} leading={<RowIcon name="information-circle-outline" tone="muted" />} />
  </ListGroup>;
  const waiting = g.members.filter(m => !m.isMe && m.status === "invited");
  if (waiting.length) return <ListGroup title="Waiting for a reply">{waiting.map(m => <MemberRow key={m.id} member={m} />)}</ListGroup>;
  return <>
    <ListGroup><ListItem title="No one accepted" leading={<RowIcon name="information-circle-outline" tone="muted" />} />
      <ListItem title="Invite Someone Else" leading={<RowIcon name="person-add-outline" />} onPress={() => openSocial("/group/" + g.id)} /></ListGroup>
    <View style={{ alignItems: "center" }}><Confirm link label="Close Group" action="Close group" text="Close this group? It moves to Past."
      run={async () => { await leave(g.id); changed(refresh); return true; }} /></View>
  </>;
}
function Chat({ group: g, refresh }: { group: Group; refresh: () => void }) {
  const { setNotice } = usePreferences(), last = g.messages?.[g.messages.length - 1]?.id, open = chatOpen(g);
  useReminderSync([g], false);
  useEffect(() => { void markRead(g.id).then(() => invalidate("/api/social/unread", "/api/social/groups")).catch(() => {}); }, [g.id, last]);
  const send = async (text: string) => {
    try { await sendMessage(g.id, text); changed(refresh); return true; }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "Your message was not sent. Try again.", error: true }); return false; }
  };
  return <>
    {open && <PlanBar group={g} />}
    <Timeline group={g} />
    {g.myStatus === "invited" ? <Invitation group={g} refresh={refresh} /> : open
      ? <ChatComposer starters={g.messages?.some(m => m.mine && m.body !== g.intro) ? [] : conversationStarters} onSend={send} />
      : <ChatState group={g} refresh={refresh} />}
  </>;
}
