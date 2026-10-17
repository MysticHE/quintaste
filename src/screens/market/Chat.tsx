import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Screen } from "../../components/Screen";
import { IconButton } from "../../components/food/Controls";
import { T, common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { ChatBubble, ChatComposer } from "../../components/Chat";
import { Confirm } from "../../components/Actions";
import { MarketModal, MarketToolbar } from "../../components/market/MarketChrome";
import { ReportSheet } from "../../components/ReportSheet";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { conversation as loadConversation, markRead, sendMessage } from "../../services/market-api";
import { block } from "../../services/social-api";
import { ApiError } from "../../services/community-api";
import { orderLabel } from "../../config/market";
import { marketMoney, slotDay } from "../../utils/market";
import { formatSgDateTime } from "../../utils/sg-datetime";
import type { Conversation } from "../../types/community";

const starters = ["Is this nut-free?", "Can you make it less sweet?", "Which pickup point is easiest?", "Is there onion or garlic in the sauce?"];
export default function MarketChatScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member ? "/api/market/conversations/" + id : null, signal => loadConversation(id, signal), 5000);
  if (!member) return <Screen hideTimers header={<MarketToolbar />}><MemberPrompt icon="chatbubbles-outline" returnTo="/market" /></Screen>;
  if (!remote.data) return <Screen hideTimers header={<MarketToolbar />}><RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/market" missing="Conversation Unavailable" /></Screen>;
  return <Thread c={remote.data} refresh={remote.refresh} />;
}
/** Open orders on top, then messages and order updates, then the composer. */
function Thread({ c, refresh }: { c: Conversation; refresh: () => void }) {
  const { setNotice } = usePreferences(), scroll = useRef<ScrollView>(null);
  const [menu, setMenu] = useState(false), [report, setReport] = useState(false);
  const last = c.messages[c.messages.length - 1]?.id;
  useEffect(() => { void markRead(c.id).then(() => invalidate("/api/market/unread", "/api/market/conversations")).catch(() => {}); }, [c.id, last]);
  const send = async (text: string) => {
    try { await sendMessage(c.id, text); refresh(); invalidate("/api/market/conversations"); return true; }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "Your message wasn't sent. Try again.", error: true }); return false; }
  };
  const blockPerson = async () => { await block(c.other.id); setMenu(false); invalidate("/api/market/"); refresh(); return true; };
  const buyer = c.role === "buyer";
  return <Screen fill hideTimers header={<MarketToolbar><View style={[common.row, { gap: 6 }]}>
    <T style={[common.bold, common.flex]} numberOfLines={1}>{c.other.name}</T>
    {buyer && <IconButton label="View Shop" icon="storefront-outline" onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: c.sellerId } })} />}
    {!c.blocked && <IconButton label="More Options" icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}
  </View></MarketToolbar>}>
    {c.openOrders.length > 0 && <ListGroup>{c.openOrders.map(o => <ListItem key={o.id} title={`${slotDay(o.starts)} · ${marketMoney(o.totalCents)}`}
      leading={<RowIcon name="receipt-outline" />} trailing={<StatusPill label={orderLabel(o.status, c.role)} tone="accent" />}
      onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: o.id } })} />)}</ListGroup>}
    <ScrollView ref={scroll} style={common.flex} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
      {c.messages.map(m => m.kind === "event"
        ? <T key={m.id} variant="caption" muted style={[common.center, m.orderId && { paddingVertical: 14 }]} accessibilityRole={m.orderId ? "button" : undefined}
          accessibilityHint={m.orderId ? "Opens the order" : undefined} onPress={m.orderId ? () => router.push({ pathname: "/market/order/[id]", params: { id: m.orderId! } }) : undefined}>{m.body}</T>
        : <ChatBubble key={m.id} mine={m.mine} text={m.body} label={(m.mine ? "You" : c.other.name) + ": " + m.body + ", " + formatSgDateTime(Date.parse(m.createdAt))} />)}
    </ScrollView>
    {c.blocked ? <View style={{ alignItems: "center" }}><StatusPill label="Messaging unavailable" /></View>
      : <ChatComposer starters={buyer && !c.messages.some(m => m.mine) ? starters : []} onSend={send} />}
    <MarketModal visible={menu} onClose={() => setMenu(false)} label={c.other.name}>
      <ListItem title="Report" leading={<RowIcon name="flag-outline" tone="warning" />} onPress={() => { setMenu(false); setReport(true); }} />
      <Confirm label="Block" text="Stop messages both ways and hide each other's shop." action={"Block " + c.other.name} run={blockPerson} />
    </MarketModal>
    <ReportSheet kind="person" targetId={c.other.id} name={c.other.name} visible={report} onClose={() => setReport(false)} onBlocked={() => { invalidate("/api/market/"); refresh(); }} />
  </Screen>;
}
