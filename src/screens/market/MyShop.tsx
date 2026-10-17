import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { T, common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { FloatingAddButton } from "../../components/FloatingAddButton";
import { Confirm } from "../../components/Actions";
import { ListingThumb } from "../../components/market/ListingPhoto";
import { MarketModal } from "../../components/market/MarketChrome";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { orders, ownListings, ownSlots, sellerState, setSlotStatus } from "../../services/market-api";
import { marketMoney, slotLabel } from "../../utils/market";
import { OrderRow } from "./Orders";
import type { SellerProfile, Slot } from "../../types/community";

const statusText: Record<SellerProfile["status"], [string, Tone]> = {
  draft: ["Not open yet", "warning"], active: ["Open", "success"], suspended: ["Suspended", "warning"], removed: ["Removed", "muted"],
};
const tabs = [{ id: "orders", label: "Orders" }, { id: "items", label: "Items" }, { id: "slots", label: "Collections" }] as const;
type Tab = typeof tabs[number]["id"];
/** The seller's workspace: shop status, then orders, items and collection slots. */
export default function MyShopScreen() {
  const { member, userId } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState);
  const [tab, setTab] = useState<Tab>("orders"), seller = remote.data?.seller;
  const add = seller && !["suspended", "removed"].includes(seller.status) && tab !== "orders"
    ? <FloatingAddButton label={tab === "items" ? "Add Item" : "Open A Collection Slot"} onPress={() => router.push(tab === "items" ? "/market/new" : "/market/slot")} /> : undefined;
  return <Screen title="My Shop" hideTimers backTo="/market" floatingAction={add}
    headerAction={seller ? <IconButton label="Shop Settings" icon="settings-outline" onPress={() => router.push("/market/setup")} /> : undefined}>
    {!member ? <MemberPrompt icon="storefront-outline" returnTo="/market/my-shop" />
      : !remote.data ? <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market/my-shop" />
      : !seller ? <Start /> : <>
        <ListGroup><ListItem title={seller.tradingName || "Your shop"} subtitle={[seller.area, seller.status === "suspended" || seller.status === "removed" ? seller.statusNote : ""].filter(Boolean).join(" · ") || undefined} wrap
          leading={<RowIcon name="storefront-outline" />} trailing={<StatusPill label={statusText[seller.status][0]} tone={statusText[seller.status][1]} />}
          onPress={() => seller.status === "active" && userId ? router.push({ pathname: "/market/shop/[id]", params: { id: userId } }) : router.push("/market/setup")} /></ListGroup>
        <View style={common.row}><SegmentedTabs options={tabs} value={tab} onChange={setTab} label="My shop" /></View>
        {tab === "orders" ? <SellerOrders /> : tab === "items" ? <SellerItems /> : <SellerSlots />}
      </>}
  </Screen>;
}
function Start() {
  return <>
    <ListGroup title="Sell on QuinTaste">
      <ListItem title="Open Your Shop" subtitle="Sell food you cook at home, or sealed packs bought from shops in Singapore" wrap leading={<RowIcon name="storefront-outline" />}
        onPress={() => router.push("/market/setup")} />
    </ListGroup>
    <T variant="small" muted style={common.center}>Buyers pay you at collection.</T>
  </>;
}
function SellerOrders() {
  const remote = useRemote("/api/market/orders?role=sell", signal => orders("sell", signal), 20000), items = remote.data?.items ?? [];
  const open = items.filter(o => ["requested", "confirmed", "ready"].includes(o.status));
  return <>
    <RemoteStatus remote={remote} icon="receipt-outline" returnTo="/market/my-shop" />
    {remote.data && (items.length ? <>
      <ListGroup title="Open">{open.map(o => <OrderRow key={o.id} order={o} role="seller" />)}</ListGroup>
      <ListGroup title="Past">{items.filter(o => !open.includes(o)).slice(0, 30).map(o => <OrderRow key={o.id} order={o} role="seller" />)}</ListGroup>
    </> : <EmptyState title="No Orders Yet" text="" icon="receipt-outline" />)}
  </>;
}
const itemTone = { active: "success", draft: "muted", paused: "muted", removed: "warning" } as const;
function SellerItems() {
  const remote = useRemote("/api/market/seller/listings", ownListings), items = remote.data?.items ?? [];
  return <>
    <RemoteStatus remote={remote} icon="pricetags-outline" returnTo="/market/my-shop" />
    {remote.data && (items.length ? <ListGroup>{items.map(item => <ListItem key={item.id} title={item.name || "Untitled item"}
      subtitle={[marketMoney(item.priceCents), item.portion, item.status === "removed" ? item.removedReason : ""].filter(Boolean).join(" · ")} wrap
      leading={<ListingThumb path={item.photos.item} />} trailing={<StatusPill label={item.status === "active" ? "Live" : item.status[0].toUpperCase() + item.status.slice(1)} tone={itemTone[item.status]} />}
      onPress={() => router.push({ pathname: "/market/edit", params: { id: item.id } })} />)}</ListGroup>
      : <EmptyState title="No Items Yet" text="" icon="pricetags-outline" primary={{ label: "Add Item", onPress: () => router.push("/market/new") }} />)}
  </>;
}
function SellerSlots() {
  const remote = useRemote("/api/market/seller/slots", ownSlots), [selected, setSelected] = useState<Slot | null>(null);
  const items = remote.data?.items ?? [];
  const change = async (status: "open" | "closed" | "cancelled") => { if (!selected) return false; await setSlotStatus(selected.id, status); setSelected(null); remote.refresh(); invalidate("/api/market/"); return true; };
  return <>
    <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market/my-shop" />
    {remote.data && (items.length ? <ListGroup>{items.map(slot => <ListItem key={slot.id} title={slotLabel(slot)}
      subtitle={[slot.mode === "delivery" ? "Delivery" : "Meetup · " + slot.place, `${slot.booked ?? 0} of ${slot.capacity} orders`].join(" · ")} wrap
      leading={<RowIcon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={slot.status === "open" ? "accent" : "muted"} />}
      trailing={slot.status === "open" ? undefined : <StatusPill label={slot.status === "closed" ? "Closed" : "Cancelled"} />}
      onPress={() => slot.status !== "cancelled" && setSelected(slot)} />)}</ListGroup>
      : <EmptyState title="No Collection Slots" text="" icon="calendar-outline" primary={{ label: "Open A Collection Slot", onPress: () => router.push("/market/slot") }} />)}
    <MarketModal visible={!!selected} onClose={() => setSelected(null)} label={selected ? slotLabel(selected) : "Slot"}>
      {selected?.status === "open" ? <Confirm label="Stop Taking Orders" text="Existing orders stay booked." action="Stop taking orders" run={() => change("closed")} />
        : <Confirm label="Reopen For Orders" text="Buyers can book any places left." action="Reopen" run={() => change("open")} />}
      <Confirm label="Cancel Slot" text="Every open order in this slot is cancelled and its buyer told." action="Cancel slot" run={() => change("cancelled")} />
    </MarketModal>
  </>;
}
