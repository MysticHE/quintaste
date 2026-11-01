import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Chip, Chips, EmptyState, HorizontalChips } from "../../components/food/Controls";
import { Button, Field, T } from "../../components/ui";
import { FieldLabel, FormSection } from "../../components/GroupedList";
import { SgDateTimeField } from "../../components/social/SgDateTimeField";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { createSlot, sellerState } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { marketLimits } from "../../config/market";
import { publicVenues } from "../../data/meet";
import { parseSgDateTime, planDateProblem, sgDateTimeText } from "../../utils/sg-datetime";
import { useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import type { SellerProfile } from "../../types/community";

export default function SlotFormScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState), seller = remote.data?.seller, t = useT("market");
  return <Screen title={t("slotTitle")} backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="calendar-outline" returnTo="/market?tab=shop" /> : seller ? <SlotForm seller={seller} />
      : remote.data ? <EmptyState title={t("setUpShopFirst")} text="" icon="storefront-outline" primary={{ label: t("setUpShop"), onPress: () => router.replace("/market?tab=shop") }} />
      : <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market?tab=shop" />}
  </Screen>;
}
const durations = [1, 2, 3, 4];
const repeats = [1, 4, 8];
const week = 7 * 86400000;
const cutoffs = [2, 12, 24, 48, 72];
const dateIssues: Record<NonNullable<ReturnType<typeof planDateProblem>>, MarketKey> = { dateIssueInvalid: "dateInvalid", dateIssuePast: "datePast", dateIssueHorizon: "dateTooFar" };
/** A time window buyers can book; capacity caps how many orders it takes. */
function SlotForm({ seller }: { seller: SellerProfile }) {
  const { theme, setNotice } = usePreferences(), limit = marketLimits.perSlot, t = useT("market");
  const [starts, setStarts] = useState(""), [hours, setHours] = useState(2), [mode, setMode] = useState<"meetup" | "delivery">(seller.meetup ? "meetup" : "delivery");
  const [place, setPlace] = useState(""), [capacity, setCapacity] = useState("10"), [cutoff, setCutoff] = useState(24), [weeks, setWeeks] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const at = parseSgDateTime(starts), ends = at === null ? "" : sgDateTimeText(at + hours * 3600000);
  const suggestions = [...(seller.area ? [seller.area + " MRT station"] : []), ...publicVenues.slice(0, 3)];
  const save = async () => {
    const dateIssue = planDateProblem(starts, Date.now());
    const issue = (dateIssue && t(dateIssues[dateIssue])) ?? (mode === "meetup" && place.trim().length < 3 ? t("meetupPointNeeded") : null)
      ?? (at !== null && at + (weeks - 1) * week - Date.now() > 60 * 86400000 ? t("slotsTooFar") : null);
    if (issue) { setError(issue); return; }
    setBusy(true); setError("");
    try {
      await createSlot({ starts, ends, mode, place, capacity: Number(capacity), cutoffHours: cutoff, repeatWeeks: weeks });
      invalidate("/api/market/"); setNotice({ text: weeks > 1 ? t("weeklySlotsOpen", { n: weeks }) : t("slotOpen") }); router.dismissTo("/market?tab=shop");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("slotSaveFailed")); }
    finally { setBusy(false); }
  };
  return <>
    <FormSection title={t("when")}>
      <SgDateTimeField label={t("starts")} value={starts} onChange={setStarts} disabled={busy} />
      <View style={{ gap: 6 }}><FieldLabel>{t("length")}</FieldLabel><Chips label={t("length")}>{durations.map(h => <Chip key={h} label={t("hours", { n: h })} role="radio" compact selected={hours === h} onPress={() => setHours(h)} />)}</Chips></View>
      <View style={{ gap: 6 }}><FieldLabel>{t("repeatWeekly")}</FieldLabel><Chips label={t("repeatWeeklyGroup")}>{repeats.map(n => <Chip key={n} label={n === 1 ? t("repeatOnce") : t("repeatWeeks", { n })} role="radio" compact selected={weeks === n} onPress={() => setWeeks(n)} />)}</Chips></View>
      <View style={{ gap: 6 }}><FieldLabel>{t("stopTakingOrdersField")}</FieldLabel><Chips label={t("cutoff")}>{cutoffs.map(h => <Chip key={h} label={h < 24 ? t("hoursBefore", { n: h }) : t("daysBefore", { n: h / 24 })} role="radio" compact selected={cutoff === h} onPress={() => setCutoff(h)} />)}</Chips></View>
    </FormSection>
    <FormSection title={t("where")}>
      <Chips label={t("collection")}>
        {seller.meetup && <Chip label={t("meetup")} role="radio" compact selected={mode === "meetup"} onPress={() => setMode("meetup")} />}
        {seller.delivery && <Chip label={t("delivery")} role="radio" compact selected={mode === "delivery"} onPress={() => setMode("delivery")} />}
      </Chips>
      <Field label={t(mode === "meetup" ? "publicMeetupPoint" : "deliveryNoteOptional")} placeholder={t(mode === "meetup" ? "meetupPlaceholder" : "deliveryNotePlaceholder")} value={place} onChangeText={setPlace} maxLength={120} editable={!busy} />
      {mode === "meetup" && <HorizontalChips>{suggestions.map(s => <Chip key={s} compact label={s} icon="location-outline" selected={place === s} onPress={() => setPlace(s)} />)}</HorizontalChips>}
    </FormSection>
    <FormSection title={t("orders")}>
      <Field label={t("mostOrders", { limit })} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={3} editable={!busy} />
    </FormSection>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={weeks > 1 ? t("openSlots", { n: weeks }) : t("openForOrders")} loading={busy} disabled={!starts || !/^\d{1,3}$/.test(capacity)} onPress={() => void save()} />
  </>;
}
