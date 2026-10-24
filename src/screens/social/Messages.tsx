import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "../../components/Screen";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate } from "../../components/social/SocialState";
import { Avatar } from "../../components/social/SocialPhoto";
import { useLineText } from "../../components/social/ChatThread";
import { ChoiceChips } from "../../components/social/ProfileControls";
import { Button, Icon, T, common } from "../../components/ui";
import { SearchField, EmptyState } from "../../components/food/Controls";
import { ThemedSwitch } from "../../components/GroupedList";
import { useMessages } from "../../hooks/useMessages";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { chatTime } from "../../utils/chat-time";

type Kind = "all" | "friends" | "market" | "classes";
type Thread = { id: string; kind: Kind; name: string; label: string; context: string; preview: string; at: string; unread: boolean; photo?: string | null; href: Href };
const kinds = ["all", "friends", "market", "classes"] as const;
export function MessagesScreen() {
  const t = useT("profile"), { theme } = usePreferences(), language = useLanguage(), data = useMessages(), describe = useLineText();
  // Older Market and Social inbox links open their own kind (/market/inbox → ?kind=market).
  const { kind: initial } = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<Kind>(kinds.find(k => k === initial) ?? "all"), [query, setQuery] = useState(""), [unreadOnly, setUnreadOnly] = useState(false);
  const rows: Thread[] = [
    ...(data.allowed ? data.friends.data?.friends ?? [] : []).filter(f => !!f.threadId).map(f => ({ id: "f:" + f.id, kind: "friends" as const, name: f.firstName, label: t("friend"), context: "", photo: f.photo,
      preview: f.last ? describe(f.last, f.firstName) : "", at: f.last?.at ?? f.updatedAt, unread: f.unread > 0, href: ("/social/chat/" + f.id) as Href })),
    ...(data.market.data?.items ?? []).map(c => ({ id: "m:" + c.id, kind: "market" as const, name: c.otherName, label: t(c.role === "buyer" ? "buying" : "selling"), context: c.context ?? "",
      preview: c.last ?? "", at: c.updatedAt, unread: c.unread, href: ("/market/chat/" + c.id) as Href })),
    ...(data.classes.data?.items ?? []).map(c => ({ id: "c:" + c.id, kind: "classes" as const, name: c.name, label: t(c.hosting ? "classMember" : "classTeacher"), context: c.title,
      preview: c.last ?? t("classUpdate"), at: c.updatedAt, unread: c.unread,
      href: { pathname: "/market/class-chat/[id]", params: { id: c.classId, ...(c.hosting ? { member: c.memberId, name: c.name } : {}) } } as Href })),
  ];
  const term = query.trim().toLowerCase(), visible = rows.filter(r => (kind === "all" || r.kind === kind) && (!unreadOnly || r.unread)
    && (!term || [r.name, r.context, r.preview].join(" ").toLowerCase().includes(term))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const sources = [ ...(kind === "all" || kind === "friends" ? [data.me, ...(data.allowed ? [data.friends] : [])] : []),
    ...(kind === "all" || kind === "market" ? [data.market] : []), ...(kind === "all" || kind === "classes" ? [data.classes] : []) ];
  const loading = sources.some(s => s.loading && !s.data), failed = sources.some(s => s.error);
  return <Screen title={t("messages")} backTo="/social" hideTimers>
    <MemberGate returnTo="/messages">
      <SearchField value={query} onChange={setQuery} placeholder={t("searchMessages")} />
      <ChoiceChips options={kinds.map(id => ({ id, label: t(id === "classes" ? "classChats" : id) }))} value={kind} onChange={setKind} label={t("messages")} />
      <View style={[common.row, { justifyContent: "flex-end", gap: 8 }]}><T variant="small" muted>{t("unreadOnly")}</T><ThemedSwitch label={t("unreadOnly")} value={unreadOnly} onChange={setUnreadOnly} /></View>
      {sources.map((remote, i) => <RemoteStatus key={i} remote={remote} icon="chatbubble-outline" returnTo="/messages" />)}
      {visible.map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={[r.name, r.label, r.context, r.preview, r.unread ? t("unreadOnly") : ""].filter(Boolean).join(", ")}
        onPress={() => router.push(r.href)} style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: pressed ? theme.accentSoft : theme.transparent })}>
        {r.kind === "friends" ? <Avatar uri={r.photo} name={r.name} size={48} /> : <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.muted, alignItems: "center", justifyContent: "center" }}><Icon name={r.kind === "market" ? "storefront-outline" : "school-outline"} /></View>}
        <View style={[common.flex, { gap: 4 }]}><View style={[common.row, { gap: 6 }]}><T style={[common.flex, r.unread && common.bold]}>{r.name}</T><T variant="caption" muted>{chatTime(r.at, language)}</T></View>
          <T variant="caption" color={theme.accent}>{r.label}</T><T variant="small" numberOfLines={2}>{r.preview}</T>
          {!!r.context && <T variant="caption" muted numberOfLines={2}>{r.context}</T>}</View>
        {r.unread && <View style={{ alignSelf: "center", width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />}
      </Pressable>)}
      {!loading && !failed && !visible.length && <EmptyState icon="chatbubbles-outline" title={t(term ? "noMessageMatch" : unreadOnly ? "noUnread" : "noMessages")} text={term || unreadOnly ? "" : t("noMessagesText")} />}
      <Button variant="link" label={t("findFriends")} icon="people-outline" onPress={() => router.push("/social/community?tab=friends")} />
    </MemberGate>
  </Screen>;
}
