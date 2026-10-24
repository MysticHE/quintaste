import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EmptyState } from "../../components/food/Controls";
import { common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { FirstRunState } from "../../components/BrowseControls";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { orders, sellerState } from "../../services/market-api";
import { orderLabelKey } from "../../config/market";
import { marketMoney, slotDay } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { OrderStatus, OrderSummary } from "../../types/community";

export const orderTone = (status: OrderStatus): Tone => status === "completed" ? "success" : ["requested", "confirmed", "ready"].includes(status) ? "accent"
  : ["no_show", "disputed"].includes(status) ? "warning" : "muted";
export function OrderRow({ order, role = "buyer" }: { order: OrderSummary; role?: "buyer" | "seller" }) {
  const t = useT("market"), language = useLanguage();
  return <ListItem title={order.summary} subtitle={[order.otherName, slotDay(order.starts, language), marketMoney(order.totalCents)].filter(Boolean).join(" · ")} wrap
    leading={<RowIcon name={order.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={orderTone(order.status) === "accent" ? "accent" : "muted"} />}
    trailing={<StatusPill label={t(orderLabelKey(order.status, role))} tone={orderTone(order.status)} />}
    onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: order.id } })} />;
}
/** Market > Orders: orders you placed, or orders for your shop, open ones first. The header search narrows them. */
export function OrdersContent({ query }: { query: string }) {
  const { member } = useMember(), [chosen, setMode] = useState<"buy" | "sell">("buy"), t = useT("market");
  const modes = [{ id: "buy", label: t("buying") }, { id: "sell", label: t("selling") }] as const;
  // Selling only appears once the member has a shop.
  const seller = useRemote(member ? "/api/market/seller" : null, sellerState).data?.seller, mode = seller ? chosen : "buy";
  const remote = useRemote(member ? "/api/market/orders?role=" + mode : null, signal => orders(mode, signal), 20000);
  const term = query.trim().toLowerCase(), all = remote.data?.items ?? [];
  const items = term ? all.filter(o => (o.summary + " " + o.otherName).toLowerCase().includes(term)) : all;
  const open = items.filter(o => ["requested", "confirmed", "ready"].includes(o.status)), role = mode === "sell" ? "seller" : "buyer";
  if (!member) return <MemberPrompt icon="receipt-outline" returnTo="/market?tab=orders" />;
  return <>
    {!!seller && <View style={common.row}><SegmentedTabs options={modes} value={mode} onChange={setMode} label={t("tabOrders")} /></View>}
    <RemoteStatus remote={remote} icon="receipt-outline" returnTo="/market?tab=orders" />
    {remote.data && (items.length ? <>
      <ListGroup title={t("open")}>{open.map(o => <OrderRow key={o.id} order={o} role={role} />)}</ListGroup>
      <ListGroup title={t("past")}>{items.filter(o => !open.includes(o)).map(o => <OrderRow key={o.id} order={o} role={role} />)}</ListGroup>
    </> : term ? <EmptyState title={t("noMatchingOrders")} text="" icon="receipt-outline" />
      : <FirstRunState icon="receipt-outline" title={t(mode === "buy" ? "firstOrderTitle" : "noOrdersYet")}
        text={t(mode === "buy" ? "firstOrderText" : "sellerOrdersText")}
        action={mode === "buy" ? { label: t("browseFood"), icon: "grid-outline", onPress: () => router.setParams({ tab: undefined }) } : undefined} />)}
  </>;
}
