import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/food/Controls";
import { common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { MarketToolbar } from "../../components/market/MarketChrome";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { orders } from "../../services/market-api";
import { orderLabel } from "../../config/market";
import { marketMoney, slotDay } from "../../utils/market";
import type { OrderStatus, OrderSummary } from "../../types/community";

export const orderTone = (status: OrderStatus): Tone => status === "completed" ? "success" : ["requested", "confirmed", "ready"].includes(status) ? "accent"
  : ["no_show", "disputed"].includes(status) ? "warning" : "muted";
export function OrderRow({ order, role = "buyer" }: { order: OrderSummary; role?: "buyer" | "seller" }) {
  return <ListItem title={order.summary} subtitle={[order.otherName, slotDay(order.starts), marketMoney(order.totalCents)].filter(Boolean).join(" · ")} wrap
    leading={<RowIcon name={order.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={orderTone(order.status) === "accent" ? "accent" : "muted"} />}
    trailing={<StatusPill label={orderLabel(order.status, role)} tone={orderTone(order.status)} />}
    onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: order.id } })} />;
}
const modes = [{ id: "buy", label: "Buying" }, { id: "sell", label: "Selling" }] as const;
/** Orders you placed, or orders for your shop, with open ones first. */
export default function MarketOrdersScreen() {
  const { member } = useMember(), [mode, setMode] = useState<"buy" | "sell">("buy");
  const remote = useRemote(member ? "/api/market/orders?role=" + mode : null, signal => orders(mode, signal), 20000);
  const items = remote.data?.items ?? [], open = items.filter(o => ["requested", "confirmed", "ready"].includes(o.status));
  return <Screen title="Orders" hideTimers header={<MarketToolbar><View style={common.row}><SegmentedTabs options={modes} value={mode} onChange={setMode} label="Orders" /></View></MarketToolbar>}>
    {!member ? <MemberPrompt icon="receipt-outline" returnTo="/market" /> : <>
      <RemoteStatus remote={remote} icon="receipt-outline" returnTo="/market" />
      {remote.data && (items.length ? <>
        <ListGroup title="Open">{open.map(o => <OrderRow key={o.id} order={o} role={mode === "sell" ? "seller" : "buyer"} />)}</ListGroup>
        <ListGroup title="Past">{items.filter(o => !open.includes(o)).map(o => <OrderRow key={o.id} order={o} role={mode === "sell" ? "seller" : "buyer"} />)}</ListGroup>
      </> : <EmptyState title="No Orders Yet" text="" icon="receipt-outline" action={mode === "buy" ? "Browse Market" : undefined} onPress={() => router.navigate("/market")} />)}
    </>}
  </Screen>;
}
