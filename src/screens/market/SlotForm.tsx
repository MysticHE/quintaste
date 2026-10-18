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
import { parseSgDateTime, planDateIssue, sgDateTimeText } from "../../utils/sg-datetime";
import type { SellerProfile } from "../../types/community";

export default function SlotFormScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState), seller = remote.data?.seller;
  return <Screen title="Collection Slot" hideTimers backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="calendar-outline" returnTo="/market?tab=shop" /> : seller ? <SlotForm seller={seller} />
      : remote.data ? <EmptyState title="Set Up Your Shop First" text="" icon="storefront-outline" primary={{ label: "Set Up Shop", onPress: () => router.replace("/market?tab=shop") }} />
      : <RemoteStatus remote={remote} icon="calendar-outline" returnTo="/market?tab=shop" />}
  </Screen>;
}
const durations = [1, 2, 3, 4];
const cutoffs = [{ hours: 2, label: "2 hours" }, { hours: 12, label: "12 hours" }, { hours: 24, label: "1 day" }, { hours: 48, label: "2 days" }, { hours: 72, label: "3 days" }];
/** A time window buyers can book; capacity caps how many orders it takes. */
function SlotForm({ seller }: { seller: SellerProfile }) {
  const { theme, setNotice } = usePreferences(), limit = marketLimits.perSlot;
  const [starts, setStarts] = useState(""), [hours, setHours] = useState(2), [mode, setMode] = useState<"meetup" | "delivery">(seller.meetup ? "meetup" : "delivery");
  const [place, setPlace] = useState(""), [capacity, setCapacity] = useState("10"), [cutoff, setCutoff] = useState(24), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const at = parseSgDateTime(starts), ends = at === null ? "" : sgDateTimeText(at + hours * 3600000);
  const suggestions = [...(seller.area ? [seller.area + " MRT station"] : []), ...publicVenues.slice(0, 3)];
  const save = async () => {
    const issue = planDateIssue(starts, Date.now()) ?? (mode === "meetup" && place.trim().length < 3 ? "Add a public meetup point." : null);
    if (issue) { setError(issue); return; }
    setBusy(true); setError("");
    try {
      await createSlot({ starts, ends, mode, place, capacity: Number(capacity), cutoffHours: cutoff });
      invalidate("/api/market/"); setNotice({ text: "Slot open for orders" }); router.dismissTo("/market?tab=shop");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "The slot wasn't saved. Try again."); }
    finally { setBusy(false); }
  };
  return <>
    <FormSection title="When">
      <SgDateTimeField label="Starts" value={starts} onChange={setStarts} disabled={busy} />
      <View style={{ gap: 6 }}><FieldLabel>Length</FieldLabel><Chips label="Length">{durations.map(h => <Chip key={h} label={h + (h === 1 ? " hour" : " hours")} role="radio" compact selected={hours === h} onPress={() => setHours(h)} />)}</Chips></View>
      <View style={{ gap: 6 }}><FieldLabel>Stop Taking Orders</FieldLabel><Chips label="Cut-off">{cutoffs.map(c => <Chip key={c.hours} label={c.label + " before"} role="radio" compact selected={cutoff === c.hours} onPress={() => setCutoff(c.hours)} />)}</Chips></View>
    </FormSection>
    <FormSection title="Where">
      <Chips label="Collection">
        {seller.meetup && <Chip label="Meetup" role="radio" compact selected={mode === "meetup"} onPress={() => setMode("meetup")} />}
        {seller.delivery && <Chip label="Delivery" role="radio" compact selected={mode === "delivery"} onPress={() => setMode("delivery")} />}
      </Chips>
      <Field label={mode === "meetup" ? "Public Meetup Point" : "Delivery Note (Optional)"} placeholder={mode === "meetup" ? "Tampines MRT, Exit A" : "East side only"} value={place} onChangeText={setPlace} maxLength={120} editable={!busy} />
      {mode === "meetup" && <HorizontalChips>{suggestions.map(s => <Chip key={s} compact label={s} icon="location-outline" selected={place === s} onPress={() => setPlace(s)} />)}</HorizontalChips>}
    </FormSection>
    <FormSection title="Orders">
      <Field label={`Most Orders (Up To ${limit})`} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={3} editable={!busy} />
    </FormSection>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Open For Orders" loading={busy} disabled={!starts || !/^\d{1,3}$/.test(capacity)} onPress={() => void save()} />
  </>;
}
