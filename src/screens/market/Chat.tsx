import { ChatContext } from "../../components/social/ChatContext";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View, type ScrollViewInstance } from "react-native";
import { Screen } from "../../components/Screen";
import { IconButton } from "../../components/food/Controls";
import { Button, T, common } from "../../components/ui";
import { ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
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
import { orderLabelKey } from "../../config/market";
import { chatTime } from "../../utils/chat-time";
import { marketMoney, messageTime, slotDay } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { Conversation } from "../../types/community";

export default function MarketChatScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember(), t = useT("market");
  const remote = useRemote(member ? "/api/market/conversations/" + id : null, signal => loadConversation(id, signal), 5000);
  if (!member) return <Screen hideTimers header={<MarketToolbar />}><MemberPrompt icon="chatbubbles-outline" returnTo="/messages" /></Screen>;
  if (!remote.data) return <Screen hideTimers header={<MarketToolbar />}><RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/messages" missing={t("conversationUnavailable")} /></Screen>;
  return <Thread c={remote.data} refresh={remote.refresh} />;
}
/** Open orders on top, then messages and order updates, then the composer. */
function Thread({ c, refresh }: { c: Conversation; refresh: () => void }) {
  const { setNotice } = usePreferences(), scroll = useRef<ScrollViewInstance>(null), t = useT("market"), tp = useT("profile"), language = useLanguage();
  const starters = [t("starterNuts"), t("starterSweet"), t("starterPickup"), t("starterAllium")];
  const [menu, setMenu] = useState(false), [report, setReport] = useState(false);
  const last = c.messages[c.messages.length - 1]?.id;
  useEffect(() => { void markRead(c.id).then(() => invalidate("/api/market/conversations")).catch(() => {}); }, [c.id, last]);
  const send = async (text: string) => {
    try { await sendMessage(c.id, text); refresh(); invalidate("/api/market/conversations"); return true; }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("messageFailed"), error: true }); return false; }
  };
  const blockPerson = async () => { await block(c.other.id); setMenu(false); invalidate("/api/market/"); refresh(); return true; };
  const buyer = c.role === "buyer";
  return <Screen fill hideTimers title={c.other.name} subtitle={tp(buyer ? "buyingRole" : "sellingRole")} backTo="/messages"
    headerAction={<View style={[common.row, { gap: 4 }]}>{buyer && <IconButton label={t("viewShop")} icon="storefront-outline" onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: c.sellerId } })} />}
      {!c.blocked && <IconButton label={t("moreOptions")} icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}</View>}>
    {c.openOrders.length > 0 && <ScrollView style={{ maxHeight: "40%", flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {c.openOrders.map(o => <ChatContext key={o.id} title={o.items || tp("order", { id: o.id.slice(0, 8) })}
        detail={slotDay(o.starts, language) + " \u00b7 " + marketMoney(o.totalCents)} status={t(orderLabelKey(o.status, c.role))} action={tp("viewOrder")} icon="receipt-outline"
        onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: o.id } })} />)}
    </ScrollView>}
    <Button label={tp("allOrders")} variant="link" onPress={() => router.push(buyer ? "/market/orders" : "/market?tab=shop")} />
    <ScrollView ref={scroll} style={common.flex} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
      {c.messages.map(m => m.kind === "event"
        ? <T key={m.id} variant="caption" muted style={[common.center, m.orderId && { paddingVertical: 14 }]} accessibilityRole={m.orderId ? "button" : undefined}
          accessibilityHint={m.orderId ? t("opensOrder") : undefined} onPress={m.orderId ? () => router.push({ pathname: "/market/order/[id]", params: { id: m.orderId! } }) : undefined}>{m.body}</T>
        : <ChatBubble key={m.id} mine={m.mine} text={m.body} time={chatTime(m.createdAt, language)} label={t("messageSpoken", { who: m.mine ? t("you") : c.other.name, text: m.body, time: messageTime(Date.parse(m.createdAt), language) })} />)}
    </ScrollView>
    {c.blocked ? <View style={{ alignItems: "center" }}><StatusPill label={t("messagingUnavailable")} /></View>
      : <ChatComposer placeholder={buyer ? tp("messageShop") : tp("messagePerson", { name: c.other.name })} starters={buyer && !c.messages.some(m => m.mine) ? starters : []} onSend={send} />}
    <MarketModal visible={menu} onClose={() => setMenu(false)} label={c.other.name}>
      <ListItem title={t("report")} leading={<RowIcon name="flag-outline" tone="warning" />} onPress={() => { setMenu(false); setReport(true); }} />
      <Confirm label={t("block")} text={t("blockPersonText")} action={t("blockName", { name: c.other.name })} run={blockPerson} />
    </MarketModal>
    <ReportSheet kind="person" targetId={c.other.id} name={c.other.name} visible={report} onClose={() => setReport(false)} onBlocked={() => { invalidate("/api/market/"); refresh(); }} />
  </Screen>;
}
