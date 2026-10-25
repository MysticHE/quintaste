import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Field, Icon, T, common, type IconName } from "../ui";
import { StatusPill, type Tone } from "../GroupedList";
import { MarketModal } from "./MarketChrome";
import { ListingThumb } from "./ListingPhoto";
import { PillButton } from "../social/PillButton";
import { orderPill } from "../social/MessageThreads";
import { useMinuteClock } from "../food/Timers";
import { invalidate } from "../../hooks/useRemote";
import { orderAction, type OrderAction } from "../../services/market-api";
import { removeSeat } from "../../services/classes-api";
import { ApiError } from "../../services/community-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { directionsUrl } from "../../utils/directions";
import { marketMoney, slotLabel } from "../../utils/market";
import type { ChatOrder, ClassSeat, CookingClass } from "../../types/community";

/** The card frame: photo or icon, title and line, status pill, facts with icons, then up to two one-word buttons. */
function Card({ photo, icon, title, line, pill, facts, children }: {
  photo?: string | null; icon: IconName; title: string; line: string; pill?: [string, Tone] | null; facts: [IconName, string][]; children: ReactNode;
}) {
  const { theme } = usePreferences();
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={[common.row, { gap: 10 }]}>
      <ListingThumb path={photo} icon={icon} />
      <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold} numberOfLines={1}>{title}</T>{!!line && <T variant="small" muted numberOfLines={2}>{line}</T>}</View>
      {pill && <StatusPill label={pill[0]} tone={pill[1]} />}
    </View>
    <View style={{ gap: 4 }}>{facts.filter(([, text]) => !!text).map(([name, text]) => <View key={name} style={[common.row, { gap: 6 }]}>
      <Icon name={name} size={15} color={theme.accent} /><T variant="small" muted style={common.flex}>{text}</T></View>)}</View>
    <View style={[common.row, { gap: 8 }]}>{children}</View>
  </View>;
}
/** "YYYY-MM-DD HH:MM" Singapore time, as the server sends it. */
const startedBy = (starts: string, now: number) => Date.parse(starts.replace(" ", "T") + ":00+08:00") <= now;

/**
 * An open order at the top of its chat (owner, 25 Oct 2026): a seller confirms or declines a new order, then marks it ready
 * and done; a buyer gets directions to the meetup. View opens the order with every other step (cancel, report, review).
 */
export function OrderCard({ order: o, seller, onChanged }: { order: ChatOrder; seller: boolean; onChanged: () => void }) {
  const t = useT("profile"), tm = useT("market"), { theme, setNotice } = usePreferences(), language = useLanguage(), now = useMinuteClock();
  const [busy, setBusy] = useState(false), [declining, setDeclining] = useState(false), [reason, setReason] = useState(""), [error, setError] = useState("");
  const amount = marketMoney(o.totalCents), pill = orderPill(o.status, seller, t);
  const run = async (body: OrderAction) => {
    setBusy(true); setError("");
    try { await orderAction(o.id, body); invalidate("/api/market/"); setDeclining(false); onChanged(); }
    catch (failure) { const text = failure instanceof ApiError ? failure.message : tm("tryAgainAction"); if (declining) setError(text); else setNotice({ text, error: true }); }
    finally { setBusy(false); }
  };
  const view = <PillButton wide label={t("view")} onPress={() => router.push({ pathname: "/market/order/[id]", params: { id: o.id } })} />;
  const directions = async () => {
    try { await Linking.openURL(directionsUrl(o.place + ", Singapore")); }
    catch { setNotice({ text: tm("mapsFailed"), error: true }); }
  };
  let actions: ReactNode = view;
  if (seller && o.status === "requested") actions = <><PillButton wide label={tm("decline")} disabled={busy} onPress={() => setDeclining(true)} />
    <PillButton wide primary label={t("cardConfirm")} busy={busy} onPress={() => void run({ action: "confirm" })} /></>;
  else if (seller && o.status === "confirmed") actions = <>{view}<PillButton wide primary label={t("cardReady")} busy={busy} onPress={() => void run({ action: "ready" })} /></>;
  else if (seller && o.status === "ready" && startedBy(o.starts, now)) actions = <>{view}<PillButton wide primary label={t("cardDone")} busy={busy} onPress={() => void run({ action: "complete" })} /></>;
  else if (!seller && o.mode === "meetup" && o.place.trim().length >= 3) actions = <>{view}<PillButton wide primary label={tm("directions")} onPress={() => void directions()} /></>;
  return <>
    {/* Items as the title; the pill says where it stands and the pay line carries the amount, so neither repeats. */}
    <Card photo={o.photo} icon="receipt-outline" title={o.items || tm("orderTitle")} line="" pill={pill} facts={[["calendar-outline", slotLabel(o, language)], ["location-outline", o.mode === "delivery" ? tm("delivery") : tm("meetup") + " · " + o.place],
        ["cash-outline", tm("payAmountAt", { amount, method: o.payment === "paynow" ? "PayNow" : tm("payCash") })]]}>{actions}</Card>
    <MarketModal visible={declining} onClose={() => setDeclining(false)} label={tm("declineOrder")}>
      <Field label={tm("reasonToBuyer")} value={reason} onChangeText={setReason} maxLength={200} />
      {!!error && <T variant="small" color={theme.error}>{error}</T>}
      <Button label={tm("declineOrder")} loading={busy} disabled={reason.trim().length < 3} onPress={() => void run({ action: "decline", reason })} />
    </MarketModal>
  </>;
}
/** The class at the top of a class chat: when, seats taken and where; a teacher can remove someone who joined. */
export function ClassCard({ cls, seat, teaching, member, memberName, onChanged }: {
  cls: CookingClass; seat: ClassSeat | null; teaching: boolean; member?: string; memberName: string; onChanged: () => void;
}) {
  const t = useT("profile"), tm = useT("market"), { setNotice } = usePreferences(), language = useLanguage();
  const [asking, setAsking] = useState(false), [busy, setBusy] = useState(false);
  const pill: [string, Tone] | null = seat === "joined" ? [t("pillBooked"), "success"] : seat === "left" ? [t("pillLeft"), "muted"] : seat === "removed" ? [t("pillRemoved"), "muted"] : null;
  const remove = async () => {
    if (!member) return;
    setBusy(true);
    try { await removeSeat(cls.id, member); invalidate("/api/market/"); setAsking(false); onChanged(); }
    catch (failure) { setNotice({ text: failure instanceof ApiError ? failure.message : tm("tryAgainAction"), error: true }); }
    finally { setBusy(false); }
  };
  const view = <PillButton wide primary={!(teaching && seat === "joined")} label={t("viewClass")} onPress={() => router.push({ pathname: "/market/class/[id]", params: { id: cls.id } })} />;
  return <>
    <Card icon="school-outline" title={cls.title} line={seat === "joined" ? t("seatPrice", { amount: marketMoney(cls.priceCents) }) : ""} pill={pill}
      facts={[["calendar-outline", slotLabel(cls, language)], ["people-outline", tm("seatsTaken", { taken: cls.taken, seats: cls.seats })],
        ["location-outline", [cls.venue, cls.area].filter(Boolean).join(" · ")]]}>
      {teaching && seat === "joined" && member ? <><PillButton wide label={t("cardRemove")} accessibilityLabel={tm("removeSeatTitle", { name: memberName })} onPress={() => setAsking(true)} />{view}</> : view}
    </Card>
    <MarketModal visible={asking} onClose={() => setAsking(false)} label={tm("removeSeatTitle", { name: memberName })}>
      <T muted>{tm("removeSeatText")}</T>
      <Button label={tm("removeSeat")} loading={busy} onPress={() => void remove()} />
    </MarketModal>
  </>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
});
