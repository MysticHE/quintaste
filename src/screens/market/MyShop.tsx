import { router } from "expo-router";
import { View } from "react-native";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { common } from "../../components/ui";
import { FirstRunState } from "../../components/BrowseControls";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { FloatingAddButton } from "../../components/FloatingAddButton";
import { ListingThumb } from "../../components/market/ListingPhoto";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { orders, ownListings, ownSlots, sellerState } from "../../services/market-api";
import { marketMoney, slotLabel } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import { OrderRow } from "./Orders";
import type { OwnListing, SellerProfile } from "../../types/community";

const statusText: Record<SellerProfile["status"], [MarketKey, Tone]> = {
  draft: ["shopNotOpen", "warning"], active: ["shopOpen", "success"], suspended: ["shopSuspended", "warning"], removed: ["shopRemoved", "muted"],
};
const shopTabs = [{ id: "orders", label: "tabOrders" }, { id: "items", label: "shopTabItems" }, { id: "slots", label: "shopTabCollections" }] as const;
export type ShopTab = typeof shopTabs[number]["id"];
/** The add button for the seller's current shop section, or nothing (orders, or a shop that can't change). */
export function useShopAdd(tab: ShopTab) {
  const { member } = useMember(), seller = useRemote(member ? "/api/market/seller" : null, sellerState).data?.seller, t = useT("market");
  return seller && !["suspended", "removed"].includes(seller.status) && tab !== "orders"
    ? <FloatingAddButton label={t(tab === "items" ? "addItem" : "openSlot")} onPress={() => router.push(tab === "items" ? "/market/new" : "/market/slot")} /> : undefined;
}
/** Market > My shop: shop status, then the seller's orders, items and collection slots. */
export function MyShopContent({ tab, setTab, query }: { tab: ShopTab; setTab: (tab: ShopTab) => void; query: string }) {
  const { member, userId } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState), seller = remote.data?.seller, t = useT("market");
  if (!member) return <MemberPrompt icon="storefront-outline" returnTo="/market?tab=shop" />;
  if (!remote.data) return <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market?tab=shop" />;
  if (!seller) return <FirstRunState icon="storefront-outline" title={t("openShopTitle")} text={t("openShopText")} action={{ label: t("openShop"), icon: "storefront-outline", onPress: () => router.push("/market/setup") }} />;
  return <>
    <ListGroup><ListItem title={seller.tradingName || t("yourShop")} subtitle={[seller.area, seller.status === "suspended" || seller.status === "removed" ? seller.statusNote : ""].filter(Boolean).join(" · ") || undefined} wrap
      leading={<RowIcon name="storefront-outline" />} trailing={<View style={[common.row, { gap: 6 }]}><StatusPill label={t(statusText[seller.status][0])} tone={statusText[seller.status][1]} />
        <IconButton label={t("shopSettings")} icon="settings-outline" onPress={() => router.push("/market/setup")} /></View>}
      onPress={() => seller.status === "active" && userId ? router.push({ pathname: "/market/shop/[id]", params: { id: userId } }) : router.push("/market/setup")} /></ListGroup>
    <View style={common.row}><SegmentedTabs options={shopTabs.map(item => ({ id: item.id, label: t(item.label) }))} value={tab} onChange={setTab} label={t("tabMyShop")} /></View>
    {tab === "orders" ? <SellerOrders /> : tab === "items" ? <SellerItems query={query} /> : <SellerSlots />}
  </>;
}
function SellerOrders() {
  const remote = useRemote("/api/market/orders?role=sell", signal => orders("sell", signal), 20000), items = remote.data?.items ?? [];
  const open = items.filter(o => ["requested", "confirmed", "ready"].includes(o.status)), t = useT("market");
  return <>
    <RemoteStatus remote={remote} icon="receipt-outline" returnTo="/market?tab=shop" />
    {remote.data && (items.length ? <>
      <ListGroup title={t("open")}>{open.map(o => <OrderRow key={o.id} order={o} role="seller" />)}</ListGroup>
      <ListGroup title={t("past")}>{items.filter(o => !open.includes(o)).slice(0, 30).map(o => <OrderRow key={o.id} order={o} role="seller" />)}</ListGroup>
    </> : <EmptyState title={t("noOrdersYetTitle")} text="" icon="receipt-outline" />)}
  </>;
}
const itemTone = { active: "success", draft: "muted", paused: "muted", removed: "warning" } as const;
const itemStatus: Record<OwnListing["status"], MarketKey> = { active: "itemLive", draft: "itemDraft", paused: "itemPaused", removed: "itemRemoved" };
function SellerItems({ query }: { query: string }) {
  const remote = useRemote("/api/market/seller/listings", ownListings), term = query.trim().toLowerCase(), t = useT("market");
  const items = (remote.data?.items ?? []).filter(item => !term || item.name.toLowerCase().includes(term));
  return <>
    <RemoteStatus remote={remote} icon="pricetags-outline" returnTo="/market?tab=shop" />
    {remote.data && (items.length ? <ListGroup>{items.map(item => <ListItem key={item.id} title={item.name || t("untitledItem")}
      subtitle={[marketMoney(item.priceCents), item.portion, item.status === "removed" ? item.removedReason : ""].filter(Boolean).join(" · ")} wrap
      leading={<ListingThumb path={item.photos.item} />} trailing={<StatusPill label={t(itemStatus[item.status])} tone={itemTone[item.status]} />}
      onPress={() => router.push({ pathname: "/market/edit", params: { id: item.id } })} />)}</ListGroup>
      : <EmptyState title={t("noItemsYet")} text="" icon="pricetags-outline" primary={{ label: t("addItem"), onPress: () => router.push("/market/new") }} />)}
  </>;
}
function SellerSlots() {
  const remote = useRemote("/api/market/seller/slots", ownSlots), items = remote.data?.items ?? [], t = useT("market"), language = useLanguage();
  return <>
    <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market?tab=shop" />
    {remote.data && (items.length ? <ListGroup>{items.map(slot => <ListItem key={slot.id} title={slotLabel(slot, language)}
      subtitle={[slot.mode === "delivery" ? t("delivery") : t("meetup") + " · " + slot.place, t("slotOrders", { booked: slot.booked ?? 0, capacity: slot.capacity })].join(" · ")} wrap
      leading={<RowIcon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={slot.status === "open" ? "accent" : "muted"} />}
      trailing={slot.status === "open" ? undefined : <StatusPill label={t(slot.status === "closed" ? "slotClosed" : "slotCancelled")} />}
      onPress={() => router.push({ pathname: "/market/slot/[id]", params: { id: slot.id } })} />)}</ListGroup>
      : <EmptyState title={t("noSlots")} text="" icon="calendar-outline" primary={{ label: t("openSlot"), onPress: () => router.push("/market/slot") }} />)}
  </>;
}
