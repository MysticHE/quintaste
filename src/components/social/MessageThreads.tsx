import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { T, common, type IconName } from "../ui";
import { StatusPill, type Tone } from "../GroupedList";
import { Avatar } from "./SocialPhoto";
import { useLineText } from "./ChatThread";
import { ListingThumb } from "../market/ListingPhoto";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { chatTime } from "../../utils/chat-time";
import { slotDay } from "../../utils/market";
import { formatSgShort } from "../../utils/sg-datetime";
import type { ClassConversation } from "../../services/classes-api";
import { BorderFrame } from "../collection/Glint";
import { borderArt } from "../../config/collection";
import type { ConversationSummary, Dinner, Friend, OrderStatus } from "../../types/community";

export type MessageTab = "friends" | "market" | "events";
export type MessageSide = "buy" | "sell" | "join" | "host";
/** `attention`: unread, or a seller's new order still waiting for an answer after its chat was read. */
export type Thread = { id: string; tab: MessageTab; side: MessageSide | null; name: string; pill: [string, Tone] | null; preview: string; context: string;
  at: string; unread: boolean; attention: boolean; photo: string | null; person: boolean; icon: IconName; href: Href; border?: string | null };
type ProfileText = ReturnType<typeof useT<"profile">>;

/** Short status words for a Market chat's latest order: a seller's new order is theirs to act on, a buyer's is waiting. */
export function orderPill(status: OrderStatus | null, seller: boolean, t: ProfileText): [string, Tone] {
  if (!status) return [t("pillAsking"), "muted"];
  if (status === "requested") return seller ? [t("pillNewOrder"), "accent"] : [t("pillRequested"), "warning"];
  return ({ confirmed: [t("pillConfirmed"), "warning"], ready: [t("pillReady"), "success"], completed: [t("pillDone"), "success"], declined: [t("pillDeclined"), "muted"],
    cancelled: [t("pillCancelled"), "muted"], no_show: [t("pillNotCollected"), "muted"], disputed: [t("pillProblem"), "warning"] } as const)[status] as [string, Tone];
}
/** A class chat: booked or not, and a teacher's unread booking reads as new. */
function seatPill(c: ClassConversation, t: ProfileText): [string, Tone] {
  if (c.seat === "joined") return c.hosting && c.unread ? [t("pillNewBooking"), "accent"] : [t("pillBooked"), "success"];
  if (c.seat === "left") return [t("pillLeft"), "muted"];
  if (c.seat === "removed") return [t("pillRemoved"), "muted"];
  return [t("pillAsking"), "muted"];
}
/** Friend chats (with an upcoming dinner's status), Market chats split by buying and selling, and class chats by joining and hosting. */
export function useThreads({ friends, dinners, market, classes }: { friends: Friend[]; dinners: Dinner[]; market: ConversationSummary[]; classes: ClassConversation[] }): Thread[] {
  const t = useT("profile"), ts = useT("social"), language = useLanguage(), describe = useLineText();
  const upcoming = (id: string) => dinners.find(d => d.withId === id && !d.past && (d.status === "invited" || d.status === "accepted"));
  return [
    ...friends.filter(f => !!f.threadId).map((f): Thread => {
      const d = upcoming(f.id);
      return { id: "f:" + f.id, tab: "friends", side: null, name: f.firstName, photo: f.photo, border: f.border, person: true, icon: "person-outline",
        pill: d ? (d.status === "accepted" ? [ts("statusConfirmed"), "success"] : d.yourTurn ? [t("pillInvited"), "accent"] : [t("pillInviteSent"), "muted"]) : null,
        context: d ? t("dinnerOn", { when: formatSgShort(d.starts, language) }) : t("friend"),
        preview: f.last ? describe(f.last, f.firstName) : "", at: f.last?.at ?? f.updatedAt, unread: f.unread > 0, attention: f.unread > 0, href: ("/social/chat/" + f.id) as Href };
    }),
    ...market.map((c): Thread => ({ id: "m:" + c.id, tab: "market", side: c.role === "seller" ? "sell" : "buy", name: c.otherName, photo: c.photo, person: false,
      icon: "storefront-outline", pill: orderPill(c.orderStatus, c.role === "seller", t),
      context: [c.context ?? "", slotDay(c.orderStarts, language)].filter(Boolean).join(" · "),
      preview: c.last ?? "", at: c.updatedAt, unread: c.unread, attention: c.unread || (c.role === "seller" && c.orderStatus === "requested"),
      href: ("/market/chat/" + c.id) as Href })),
    ...classes.map((c): Thread => ({ id: "c:" + c.id, tab: "events", side: c.hosting ? "host" : "join", name: c.name, photo: null, person: false, icon: "school-outline",
      pill: seatPill(c, t), context: [c.title, formatSgShort(c.starts, language)].filter(Boolean).join(" · "),
      preview: c.last ?? t("classUpdate"), at: c.updatedAt, unread: c.unread, attention: c.unread,
      href: { pathname: "/market/class-chat/[id]", params: { id: c.classId, ...(c.hosting ? { member: c.memberId, name: c.name } : {}) } } as Href })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
/** One chat: photo (person, item, or the kind's icon), name and status, the latest line (bold while unread), then what it is about and when. */
export function ThreadRow({ thread: r }: { thread: Thread }) {
  const { theme } = usePreferences(), language = useLanguage(), t = useT("profile");
  return <Pressable accessibilityRole="button" accessibilityLabel={[r.name, r.pill?.[0], r.preview, r.context, r.unread ? t("unreadRow") : ""].filter(Boolean).join(", ")}
    onPress={() => router.push(r.href)} style={({ pressed }) => [s.row, { borderBottomColor: theme.divider, backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
    {r.person ? <BorderFrame art={r.border ? borderArt(r.border) : undefined} size={50}><Avatar uri={r.photo} size={50} /></BorderFrame> : <ListingThumb path={r.photo} icon={r.icon} size={50} />}
    <View style={[common.flex, { gap: 2, minWidth: 0 }]}>
      <View style={[common.row, { gap: 8 }]}><T numberOfLines={1} style={[common.flex, common.bold]}>{r.name}</T>{r.pill && <StatusPill label={r.pill[0]} tone={r.pill[1]} />}</View>
      {!!r.preview && <T variant="small" numberOfLines={1} color={r.unread ? theme.foreground : theme.mutedForeground} style={r.unread && common.bold}>{r.preview}</T>}
      <View style={[common.row, { gap: 8 }]}><T variant="caption" muted numberOfLines={1} style={common.flex}>{r.context}</T><T variant="caption" muted>{chatTime(r.at, language)}</T></View>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
});
