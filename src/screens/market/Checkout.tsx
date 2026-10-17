import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Chip, Chips, EmptyState, IconButton } from "../../components/food/Controls";
import { Button, Field, T, common } from "../../components/ui";
import { FieldLabel, FormSection, ListGroup, ListItem } from "../../components/GroupedList";
import { ListingThumb } from "../../components/market/ListingPhoto";
import { SlotOption } from "../../components/market/ShopParts";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { placeOrder, shop as loadShop } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { usePreferences } from "../../state/Preferences";
import { marketMoney } from "../../utils/market";
import { parseSgDateTime } from "../../utils/sg-datetime";
import type { ShopPage } from "../../types/community";

export default function CheckoutScreen() {
  const { seller = "", listing, slot } = useLocalSearchParams<{ seller: string; listing?: string; slot?: string }>(), { member } = useMember();
  const remote = useRemote(member && seller ? "/api/market/shops/" + seller : null, signal => loadShop(seller, signal));
  return <Screen title="Order" hideTimers backTo="/market">
    {!member ? <MemberPrompt icon="bag-handle-outline" returnTo="/market" />
      : remote.data ? <Checkout key={remote.data.id} shop={remote.data} listing={listing} slot={slot} />
      : <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market" missing="Shop Unavailable" />}
  </Screen>;
}
/** Choose items, a collection slot and how to pay at handover. Nothing is charged in the app. */
function Checkout({ shop, listing, slot: initialSlot }: { shop: ShopPage; listing?: string; slot?: string }) {
  const { theme } = usePreferences();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => listing ? { [listing]: 1 } : {});
  const [slotId, setSlotId] = useState(initialSlot ?? ""), [address, setAddress] = useState(""), [contact, setContact] = useState(""), [note, setNote] = useState("");
  const [payment, setPayment] = useState<"cash" | "paynow">(shop.payCash ? "cash" : "paynow"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const chosen = shop.items.filter(item => (quantities[item.id] ?? 0) > 0);
  const lead = Math.max(0, ...chosen.map(item => item.leadDays)), now = useMinuteClock();
  const usable = (starts: string) => (parseSgDateTime(starts) ?? 0) >= now + lead * 86400000;
  const slot = shop.slots.find(item => item.id === slotId && usable(item.starts)), delivery = slot?.mode === "delivery";
  const subtotal = chosen.reduce((sum, item) => sum + item.priceCents * quantities[item.id], 0), fee = delivery ? shop.deliveryFeeCents : 0;
  const change = (id: string, delta: number, max: number) => setQuantities(current => ({ ...current, [id]: Math.max(0, Math.min(max, (current[id] ?? 0) + delta)) }));
  const ready = chosen.length > 0 && !!slot && (!delivery || (address.trim().length >= 5 && contact.trim().length >= 8));
  const submit = async () => {
    if (!slot) return;
    setBusy(true); setError("");
    try {
      const result = await placeOrder({ sellerId: shop.id, slotId: slot.id, items: chosen.map(item => ({ listingId: item.id, quantity: quantities[item.id] })), address, contact, note, payment });
      invalidate("/api/market/");
      router.replace({ pathname: "/market/order/[id]", params: { id: result.id } });
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "Your order wasn't placed. Try again."); }
    finally { setBusy(false); }
  };
  if (!shop.items.length) return <EmptyState title="Nothing On Sale" text="" icon="storefront-outline" />;
  return <>
    <T variant="subtitle">{shop.tradingName}</T>
    <ListGroup title="Items">{shop.items.map(item => <ListItem key={item.id} title={item.name} subtitle={marketMoney(item.priceCents) + (item.portion ? " · " + item.portion : "")}
      leading={<ListingThumb path={item.photo} />} trailing={<View style={[common.row, { gap: 6 }]}>
        <IconButton label={"Fewer " + item.name} icon="remove" disabled={!quantities[item.id]} onPress={() => change(item.id, -1, item.maxPerOrder)} />
        <T accessibilityLabel={(quantities[item.id] ?? 0) + " of " + item.name} style={{ minWidth: 20, textAlign: "center" }}>{quantities[item.id] ?? 0}</T>
        <IconButton label={"More " + item.name} icon="add" disabled={(quantities[item.id] ?? 0) >= item.maxPerOrder} onPress={() => change(item.id, 1, item.maxPerOrder)} />
      </View>} />)}</ListGroup>
    <FormSection title="Collection">
      {shop.slots.length ? shop.slots.map(item => <SlotOption key={item.id} slot={item} selected={slot?.id === item.id} disabled={!usable(item.starts)} onPress={() => setSlotId(item.id)} />)
        : <T muted>No collection slots are open. Message the shop or check back soon.</T>}
      {lead > 0 && <T variant="small" muted>{`Your items need ${lead} ${lead === 1 ? "day" : "days"}' notice.`}</T>}
      {delivery && <><Field label="Delivery Address" value={address} onChangeText={setAddress} maxLength={200} multiline placeholder="Block, street, unit and postal code" />
        <Field label="Contact Number" value={contact} onChangeText={setContact} maxLength={40} keyboardType="phone-pad" />
        <T variant="small" muted>Shared only with this seller for your delivery.</T></>}
      <Field label="Note For The Seller (Optional)" value={note} onChangeText={setNote} maxLength={300} placeholder="e.g. Less sweet, please" />
    </FormSection>
    <FormSection title="Payment">
      <View style={{ gap: 6 }}><FieldLabel>Pay the seller at collection</FieldLabel><Chips label="Payment">
        {shop.payCash && <Chip label="Cash" role="radio" compact selected={payment === "cash"} onPress={() => setPayment("cash")} />}
        {shop.payPaynow && <Chip label="PayNow" role="radio" compact selected={payment === "paynow"} onPress={() => setPayment("paynow")} />}
      </Chips></View>
      <View style={common.spread}><T muted>Items</T><T>{marketMoney(subtotal)}</T></View>
      {delivery && <View style={common.spread}><T muted>Delivery</T><T>{fee ? marketMoney(fee) : "Free"}</T></View>}
      <View style={common.spread}><T style={common.bold}>Total at collection</T><T style={common.bold} color={theme.accent}>{marketMoney(subtotal + fee)}</T></View>
    </FormSection>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Place Order" icon="bag-check-outline" loading={busy} disabled={!ready} onPress={() => void submit()} />
    <T variant="small" muted style={common.center}>{"The seller confirms your order. QuinTaste doesn't take payment."}</T>
  </>;
}
