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
import { orderLabelKey } from "../../config/market";
import { slotCutoffLabel, slotCutoffPassed, slotLabel, slotPlace } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import { orderTone } from "./Orders";
import type { SlotPack } from "../../types/community";

/** My shop > Collections > a slot: what to make in total, each order to pack, and the slot's controls. */
export default function SlotPackScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member && id ? "/api/market/seller/slots/" + id : null, signal => slotPack(id, signal), 20000), t = useT("market");
  return <Screen title={t("slotPackTitle")} hideTimers backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="calendar-outline" returnTo="/market?tab=shop" />
      : remote.data ? <Pack pack={remote.data} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market?tab=shop" missing={t("slotUnavailable")} />}
  </Screen>;
}
function Pack({ pack, refresh }: { pack: SlotPack; refresh: () => void }) {
  const { slot } = pack, now = useMinuteClock(), cutoff = slotCutoffPassed(slot, now), t = useT("market"), language = useLanguage();
  const [state, tone]: [MarketKey, Tone] = slot.status === "cancelled" ? ["slotCancelled", "muted"] : slot.status === "closed" ? ["slotNotTaking", "muted"]
    : cutoff ? ["slotOrdersClosed", "muted"] : ["shopOpen", "success"];
  const change = async (status: "open" | "closed" | "cancelled") => { await setSlotStatus(slot.id, status); invalidate("/api/market/"); refresh(); return true; };
  return <>
    <ListGroup>
      <ListItem title={slotLabel(slot, language)} subtitle={slotPlace(slot, t)} wrap
        leading={<RowIcon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} tone={tone === "success" ? "accent" : "muted"} />}
        trailing={<StatusPill label={t(state)} tone={tone} />} />
      <ListItem title={t("slotOrders", { booked: slot.booked ?? 0, capacity: slot.capacity })} subtitle={slot.status === "open" && !cutoff ? t("ordersClose", { when: slotCutoffLabel(slot, language) }) : undefined}
        leading={<RowIcon name="time-outline" />} />
    </ListGroup>
    {pack.toMake.length > 0 && <ListGroup title={t("toMake")}>{pack.toMake.map(item => <ListItem key={item.key} title={item.name} wrap
      trailing={<T style={common.bold}>{item.perSlot ? t("quantityOfLimit", { n: item.quantity, limit: item.perSlot }) : String(item.quantity)}</T>} />)}</ListGroup>}
    {pack.orders.length ? <ListGroup title={t("orders")}>{pack.orders.map(o => <ListItem key={o.id} title={o.buyerName} wrap
      subtitle={[o.summary, o.address, o.note && "“" + o.note + "”"].filter(Boolean).join(" · ")}
      trailing={<StatusPill label={t(orderLabelKey(o.status, "seller"))} tone={orderTone(o.status)} />}
      onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: o.id } })} />)}</ListGroup>
      : <EmptyState title={t("noOrdersYetTitle")} text="" icon="receipt-outline" />}
    {slot.status !== "cancelled" && <>
      {slot.status === "open" ? <Confirm label={t("stopTakingOrders")} text={t("stopText")} action={t("stopAction")} run={() => change("closed")} />
        : <Confirm label={t("reopenForOrders")} text={t("reopenText")} action={t("reopenAction")} run={() => change("open")} />}
      <Confirm link label={t("cancelSlot")} text={t("cancelSlotText")} action={t("cancelSlotAction")} run={() => change("cancelled")} />
    </>}
  </>;
}
