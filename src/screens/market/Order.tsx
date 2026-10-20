import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Chip, Chips, HorizontalChips } from "../../components/food/Controls";
import { Button, Field, T, common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { Action, ActionChip } from "../../components/Actions";
import { MarketModal, MarketToolbar } from "../../components/market/MarketChrome";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { order as loadOrder, orderAction, type OrderAction } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { orderLabel, problemReasons } from "../../config/market";
import { itemsParam, marketMoney, slotLabel } from "../../utils/market";
import { directionsUrl } from "../../utils/directions";
import { formatDay } from "../../utils/day";
import { orderTone } from "./Orders";
import type { Order } from "../../types/community";

export default function MarketOrderScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member ? "/api/market/orders/" + id : null, signal => loadOrder(id, signal), 15000);
  return <Screen title="Order" hideTimers header={<MarketToolbar />}>
    {!member ? <MemberPrompt icon="receipt-outline" returnTo="/market" /> : remote.data ? <OrderView key={remote.data.status} order={remote.data} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="receipt-outline" returnTo="/market" missing="Order Unavailable" />}
  </Screen>;
}
type Sheet = "decline" | "cancel" | "review" | "problem" | null;
function OrderView({ order: o, refresh }: { order: Order; refresh: () => void }) {
  const { theme, setNotice } = usePreferences(), seller = o.role === "seller";
  const [sheet, setSheet] = useState<Sheet>(null), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [rating, setRating] = useState(o.rating), [review, setReview] = useState(o.review), [matched, setMatched] = useState<boolean | null>(o.dietMatched), [problem, setProblem] = useState("");
  const run = async (body: OrderAction) => { await orderAction(o.id, body); invalidate("/api/market/"); refresh(); };
  const submit = async (body: OrderAction, done = "") => {
    setBusy(true); setError("");
    try { await run(body); setSheet(null); if (done) setNotice({ text: done }); }
    catch (problem) { setError(problem instanceof ApiError ? problem.message : "That didn't work. Try again."); }
    finally { setBusy(false); }
  };
  const now = useMinuteClock();
  const s = o.status, open = ["requested", "confirmed", "ready"].includes(s), started = Date.parse(o.starts.replace(" ", "T") + ":00+08:00") <= now;
  const withOther = () => o.conversationId && router.push({ pathname: "/market/chat/[id]", params: { id: o.conversationId } });
  const explanation = o.closed ? "The other person deleted their account." : o.statusReason;
  // Buyers head to the meetup point; a delivering seller heads to the buyer's address.
  const destination = o.mode === "meetup" ? o.place : seller ? o.address : "";
  const directions = async () => {
    try { await Linking.openURL(directionsUrl(destination + ", Singapore")); }
    catch { setNotice({ text: "Maps couldn't open. Try again.", error: true }); }
  };
  const again = !seller && !open && !o.closed && o.items.some(item => item.listingId);
  return <>
    <View style={[common.spread, { gap: 8 }]}><T variant="subtitle" style={common.flex}>{seller ? o.buyer.name : o.seller.name}</T><StatusPill label={orderLabel(s, o.role)} tone={orderTone(s)} /></View>
    {!!explanation && <T muted>{explanation}</T>}
    <ListGroup>
      <ListItem title={slotLabel(o)} subtitle={o.mode === "delivery" ? "Delivery" : "Meetup · " + o.place} leading={<RowIcon name={o.mode === "delivery" ? "bicycle-outline" : "location-outline"} />} wrap />
      {o.mode === "delivery" && <ListItem title={o.address} subtitle={o.contact} leading={<RowIcon name="home-outline" />} wrap />}
      <ListItem title={`Pay ${marketMoney(o.totalCents)} at collection · ${o.payment === "paynow" ? "PayNow" : "Cash"}`} subtitle={o.deliveryFeeCents ? `Includes ${marketMoney(o.deliveryFeeCents)} delivery` : undefined} leading={<RowIcon name="cash-outline" />} />
      {!seller && <ListItem title={o.seller.name} leading={<RowIcon name="storefront-outline" />} onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: o.seller.id } })} />}
    </ListGroup>
    <ListGroup title="Items">{o.items.map((item, i) => <ListItem key={i} title={`${item.quantity} × ${item.name}`} subtitle={[marketMoney(item.priceCents * item.quantity), item.dateMark && "Date mark " + formatDay(item.dateMark), item.lot && "Lot " + item.lot].filter(Boolean).join(" · ")} wrap />)}</ListGroup>
    {!!o.note && <ListGroup><ListItem title={o.note} leading={<RowIcon name="chatbox-outline" />} wrap /></ListGroup>}
    {!o.closed && <>
    {seller && s === "requested" && <View style={common.row}>
      <View style={common.flex}><Button label="Decline" variant="secondary" onPress={() => setSheet("decline")} /></View>
      <View style={common.flex}><Action label="Confirm Order" run={() => run({ action: "confirm" })} /></View></View>}
    {seller && s === "confirmed" && <Action label="Mark Ready" run={() => run({ action: "ready" })} />}
    {seller && started && (s === "confirmed" || s === "ready") && <Action label="Handed Over And Paid" icon="checkmark-done-outline" secondary={s === "confirmed"} run={() => run({ action: "complete" })} />}
    {!seller && s === "completed" && !o.rating && <Button label="Leave A Review" icon="star-outline" onPress={() => setSheet("review")} />}
    <HorizontalChips bleed>
      {open && destination.trim().length >= 3 && <Chip compact icon="navigate-outline" label="Directions" onPress={() => void directions()} />}
      {o.conversationId && <Chip compact icon="chatbubble-outline" label={seller ? "Message Buyer" : "Message Seller"} onPress={() => withOther()} />}
      {again && <Chip compact icon="repeat-outline" label="Order Again" onPress={() => router.push({ pathname: "/market/checkout", params: { seller: o.seller.id, items: itemsParam(o.items) } })} />}
      {seller && started && (s === "confirmed" || s === "ready") && <ActionChip icon="alert-circle-outline" label="Not Collected" run={() => run({ action: "no-show" })} />}
      {open && (seller || s === "requested" || !o.cutoffPassed) && <Chip compact icon="close-outline" label="Cancel Order" onPress={() => setSheet("cancel")} />}
      {!seller && (s === "completed" || s === "no_show" || (open && started)) && <Chip compact icon="flag-outline" label="Report A Problem" onPress={() => setSheet("problem")} />}
    </HorizontalChips></>}
    {!!o.rating && <ListGroup title="Your review"><ListItem title={"★ " + o.rating + (o.dietMatched === false ? " · Diet label didn't match" : "")} subtitle={o.review || undefined} wrap /></ListGroup>}
    <MarketModal visible={sheet === "decline" || sheet === "cancel"} onClose={() => setSheet(null)} label={sheet === "decline" ? "Decline Order" : "Cancel Order"}>
      {(seller || sheet === "decline") && <Field label="Reason Shown To The Buyer" value={reason} onChangeText={setReason} maxLength={200} />}
      {!!error && <T variant="small" color={theme.error}>{error}</T>}
      <Button label={sheet === "decline" ? "Decline Order" : "Cancel Order"} loading={busy} disabled={seller && reason.trim().length < 3}
        onPress={() => void submit({ action: sheet === "decline" ? "decline" : "cancel", reason })} />
    </MarketModal>
    <MarketModal visible={sheet === "review"} onClose={() => setSheet(null)} label="Review">
      <HorizontalChips>{[1, 2, 3, 4, 5].map(value => <Chip key={value} label={String(value)} icon="star" role="radio" selected={rating === value} onPress={() => setRating(value)} />)}</HorizontalChips>
      <T>Did the food match its diet label?</T>
      <Chips label="Diet label"><Chip label="Yes" role="radio" compact selected={matched === true} onPress={() => setMatched(true)} /><Chip label="No" role="radio" compact selected={matched === false} onPress={() => setMatched(false)} /></Chips>
      <Field label="Comment (Optional)" value={review} onChangeText={setReview} maxLength={300} />
      {!!error && <T variant="small" color={theme.error}>{error}</T>}
      <Button label="Save Review" loading={busy} disabled={!rating || matched === null} onPress={() => void submit({ action: "review", rating, review, dietMatched: matched ?? true }, "Review saved")} />
    </MarketModal>
    <MarketModal visible={sheet === "problem"} onClose={() => setSheet(null)} label="Report A Problem">
      <Chips label="Problem">{problemReasons.map(item => <Chip key={item} label={item} role="radio" compact selected={problem === item} onPress={() => setProblem(item)} />)}</Chips>
      <Field label="What Happened (Optional)" value={reason} onChangeText={setReason} maxLength={1000} multiline />
      {problem === "Made me unwell" && <T variant="small" muted>{"If you're unwell, see a doctor. You can also tell SFA through its online feedback form."}</T>}
      {!!error && <T variant="small" color={theme.error}>{error}</T>}
      <Button label="Send Report" loading={busy} disabled={!problem} onPress={() => void submit({ action: "problem", problem, details: reason }, "Report sent")} />
    </MarketModal>
  </>;
}
