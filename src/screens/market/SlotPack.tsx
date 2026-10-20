import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState } from "../../components/food/Controls";
import { T, common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { Confirm } from "../../components/Actions";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { setSlotStatus, slotPack } from "../../services/market-api";
import { orderLabel } from "../../config/market";
import { slotCutoffLabel, slotCutoffPassed, slotLabel } from "../../utils/market";
import { orderTone } from "./Orders";
import type { SlotPack } from "../../types/community";

/** My shop > Collections > a slot: what to make in total, each order to pack, and the slot's controls. */
export default function SlotPackScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member && id ? "/api/market/seller/slots/" + id : null, signal => slotPack(id, signal), 20000);
  return <Screen title="Collection" hideTimers backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="calendar-outline" returnTo="/market?tab=shop" />
      : remote.data ? <Pack pack={remote.data} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market?tab=shop" missing="Slot Unavailable" />}
  </Screen>;
}
function Pack({ pack, refresh }: { pack: SlotPack; refresh: () => void }) {
  const { slot } = pack, now = useMinuteClock(), cutoff = slotCutoffPassed(slot, now);
  const [state, tone]: [string, Tone] = slot.status === "cancelled" ? ["Cancelled", "muted"] : slot.status === "closed" ? ["Not taking orders", "muted"]
    : cutoff ? ["Orders closed", "muted"] : ["Open", "success"];
  const change = async (status: "open" | "closed" | "cancelled") => { await setSlotStatus(slot.id, status); invalidate("/api/market/"); refresh(); return true; };
  return <>
    <ListGroup>
      <ListItem title={slotLabel(slot)} subtitle={slot.mode === "delivery" ? "Delivery" + (slot.place ? " · " + slot.place : "") : "Meetup · " + slot.place} wrap
        leading={<RowIcon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={tone === "success" ? "accent" : "muted"} />}
        trailing={<StatusPill label={state} tone={tone} />} />
      <ListItem title={`${slot.booked ?? 0} of ${slot.capacity} orders`} subtitle={slot.status === "open" && !cutoff ? "Orders close " + slotCutoffLabel(slot) : undefined}
        leading={<RowIcon name="time-outline" />} />
    </ListGroup>
    {pack.toMake.length > 0 && <ListGroup title="To make">{pack.toMake.map(item => <ListItem key={item.name} title={item.name} wrap
      trailing={<T style={common.bold}>{item.perSlot ? `${item.quantity} of ${item.perSlot}` : String(item.quantity)}</T>} />)}</ListGroup>}
    {pack.orders.length ? <ListGroup title="Orders">{pack.orders.map(o => <ListItem key={o.id} title={o.buyerName} wrap
      subtitle={[o.summary, o.address, o.note && "“" + o.note + "”"].filter(Boolean).join(" · ")}
      trailing={<StatusPill label={orderLabel(o.status, "seller")} tone={orderTone(o.status)} />}
      onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: o.id } })} />)}</ListGroup>
      : <EmptyState title="No Orders Yet" text="" icon="receipt-outline" />}
    {slot.status !== "cancelled" && <>
      {slot.status === "open" ? <Confirm label="Stop Taking Orders" text="Existing orders stay booked." action="Stop taking orders" run={() => change("closed")} />
        : <Confirm label="Reopen For Orders" text="Buyers can book any places left." action="Reopen" run={() => change("open")} />}
      <Confirm link label="Cancel Slot" text="Every open order in this slot is cancelled and its buyer told." action="Cancel slot" run={() => change("cancelled")} />
    </>}
  </>;
}
