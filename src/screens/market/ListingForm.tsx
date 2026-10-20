import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Chip, Chips, EmptyState } from "../../components/food/Controls";
import { Button, Field, T, common } from "../../components/ui";
import { FieldLabel, FormSection } from "../../components/GroupedList";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { DateField } from "../../components/DateField";
import { Confirm } from "../../components/Actions";
import { AllergenEditor } from "../../components/market/Ingredients";
import { MarketModal } from "../../components/market/MarketChrome";
import { ListingPhotos, photoBudgets } from "../../components/market/ListingPhotos";
import { DietChoices, DietPills } from "../../components/market/ShopParts";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { deleteListing, ownListing, saveListing, sellerState, setListingStatus, withdrawListing, type PhotoChanges } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { kindLabels, marketLimits, shopCategories } from "../../config/market";
import { dietWarnings, draftFrom, draftLabels, listingErrors, listingInput, type ListingDraft } from "../../utils/market";
import { dayAfter } from "../../utils/day";
import type { OwnListing, SellerProfile, ShopPhotoSlot } from "../../types/community";

export default function ListingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(), { member } = useMember(), title = id ? "Edit Item" : "New Item";
  const shop = useRemote(member ? "/api/market/seller" : null, sellerState);
  const item = useRemote(member && id ? "/api/market/seller/listings/" + id : null, signal => ownListing(id ?? "", signal));
  const seller = shop.data?.seller;
  return <Screen title={title} hideTimers backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="storefront-outline" returnTo="/market?tab=shop" />
      : !shop.data ? <RemoteStatus remote={shop} icon="storefront-outline" returnTo="/market?tab=shop" />
      : !seller ? <EmptyState title="Set Up Your Shop First" text="" icon="storefront-outline" primary={{ label: "Set Up Shop", onPress: () => router.replace("/market?tab=shop") }} />
      : id && !item.data ? <RemoteStatus remote={item} icon="pricetags-outline" returnTo="/market?tab=shop" missing="Item Unavailable" />
      : <ListingForm key={id ?? "new"} initial={id ? item.data : undefined} seller={seller} />}
  </Screen>;
}
const kinds = [{ id: "made", label: kindLabels.made }, { id: "prepacked", label: kindLabels.prepacked }] as const;
const leadChoices = [0, 1, 2, 3, 5, 7];
function photoChanges(d: ListingDraft, initial?: OwnListing): PhotoChanges {
  const changes: PhotoChanges = {};
  for (const slot of ["item", "detail", "label"] as ShopPhotoSlot[]) {
    const value = d.photos[slot];
    if (value?.startsWith("data:")) changes[slot] = value;
    else if (!value && initial?.photos[slot]) changes[slot] = null;
  }
  return changes;
}
/** Photos, details, food facts and ordering rules. Drafts save anything; publishing checks every rule. */
function ListingForm({ initial, seller }: { initial?: OwnListing; seller: SellerProfile }) {
  const { theme, setNotice } = usePreferences();
  const [d, setDraft] = useState(() => draftFrom(initial)), now = useMinuteClock();
  const [attempted, setAttempted] = useState<boolean>(), [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [failure, setFailure] = useState("");
  const locked = busy || photoBusy, live = initial?.status === "active", canPublish = seller.status === "active" && initial?.status !== "removed";
  const errors = attempted === undefined ? {} : listingErrors(d, attempted, now), warnings = dietWarnings(d);
  const set = (patch: Partial<ListingDraft>) => setDraft(current => ({ ...current, ...patch }));
  const save = async (publish: boolean) => {
    if (locked) return;
    setAttempted(publish); setFailure("");
    if (Object.keys(listingErrors(d, publish, Date.now())).length) return;
    setBusy(true);
    try {
      await saveListing(initial?.id ?? null, { listing: listingInput(d), photos: photoChanges(d, initial), publish });
      invalidate("/api/market/");
      setNotice({ text: publish ? (live ? "Changes saved" : "Item is live") : "Draft saved" });
      router.dismissTo("/market?tab=shop");
    } catch (error) { setFailure(error instanceof ApiError ? error.message : "Your item wasn't saved. Try again."); }
    finally { setBusy(false); }
  };
  const slots: ShopPhotoSlot[] = d.kind === "prepacked" ? ["item", "label"] : ["item", "detail"];
  return <>
    {initial?.status === "removed" && <T color={theme.warning}>{"QuinTaste removed this item: " + initial.removedReason}</T>}
    <View style={common.row}><SegmentedTabs options={kinds} value={d.kind} onChange={kind => set({ kind })} label="Item type" /></View>
    <FormSection title="Photos">
      <ListingPhotos slots={slots} value={d.photos} disabled={locked} onBusy={setPhotoBusy} error={errors.photos} budget={photoBudgets.upload} onChange={photos => set({ photos })} />
    </FormSection>
    <FormSection title="Details">
      <Field label="Item" placeholder="Pandan chiffon cake" value={d.name} onChangeText={name => set({ name })} maxLength={80} error={errors.name} editable={!locked} />
      <View style={{ gap: 6 }}><FieldLabel>Category</FieldLabel><Chips label="Category">{shopCategories.map(c => <Chip key={c.id} label={c.id} role="radio" compact
        selected={d.category === c.id} disabled={locked} onPress={() => set({ category: c.id })} />)}</Chips></View>
      <View style={[common.row, { alignItems: "flex-start", gap: 8 }]}>
        <View style={common.flex}><Field label="Price (S$)" value={d.price} onChangeText={price => set({ price })} keyboardType="decimal-pad" maxLength={7} error={errors.price} editable={!locked} /></View>
        <View style={common.flex}><Field label="Portion" placeholder="8 slices" value={d.portion} onChangeText={portion => set({ portion })} maxLength={40} error={errors.portion} editable={!locked} /></View>
      </View>
      <Field label="Description (Optional)" value={d.description} onChangeText={description => set({ description })} maxLength={500} multiline editable={!locked} />
    </FormSection>
    <FormSection title="Food facts">
      <Field label="Ingredients" placeholder="Every ingredient, including what's in sauces and spice mixes" value={d.ingredients} multiline error={errors.ingredients}
        editable={!locked} onChangeText={ingredients => set({ ingredients })} />
      <View style={{ gap: 6 }}><FieldLabel>Allergens</FieldLabel><AllergenEditor value={d.info} disabled={locked} onChange={info => set({ info })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Diet Labels</FieldLabel><DietPills labels={draftLabels(d)} practices={d.diets} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Practices (Optional)</FieldLabel><DietChoices value={d.diets} onChange={diets => set({ diets })} disabled={locked} warnings={warnings} error={errors.diets} /></View>
      <Field label="Storage" placeholder="Keep chilled, best eaten within 2 days" value={d.storage} onChangeText={storage => set({ storage })} maxLength={200} error={errors.storage} editable={!locked} />
      {d.kind === "prepacked" && <>
        <DateField label="Date Mark" value={d.dateMark} minimum={dayAfter(now, 1)} error={errors.dateMark} disabled={locked} onChange={dateMark => set({ dateMark })} />
        <Field label="Lot Or Batch Number" value={d.lot} onChangeText={lot => set({ lot })} maxLength={40} error={errors.lot} editable={!locked} />
      </>}
    </FormSection>
    <FormSection title="Ordering">
      <View style={{ gap: 6 }}><FieldLabel>Order Ahead</FieldLabel><Chips label="Order ahead">{leadChoices.map(days => <Chip key={days} label={days ? days + (days === 1 ? " day" : " days") : "Same day"}
        role="radio" compact selected={d.leadDays === days} disabled={locked} onPress={() => set({ leadDays: days })} />)}</Chips></View>
      <Field label={`Most Per Order (Up To ${marketLimits.perOrder})`} value={d.maxPerOrder} onChangeText={maxPerOrder => set({ maxPerOrder })} keyboardType="number-pad" maxLength={2} error={errors.maxPerOrder} editable={!locked} />
      <Field label="Most Per Collection (Optional)" placeholder="No limit" value={d.perSlot} onChangeText={perSlot => set({ perSlot })} keyboardType="number-pad" maxLength={3} error={errors.perSlot} editable={!locked} />
    </FormSection>
    {!!(failure || Object.keys(errors).length) && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{failure || "Complete the highlighted fields."}</T>}
    {canPublish && <Button label={live ? "Save Changes" : "Publish"} disabled={photoBusy} loading={busy} onPress={() => void save(true)} />}
    {!live && <Button label="Save Draft" variant={canPublish ? "secondary" : "primary"} disabled={locked} onPress={() => void save(false)} />}
    {!canPublish && seller.status !== "active" && <T variant="small" muted style={common.center}>Open your shop to publish.</T>}
    {live && initial && <Confirm link label="Pause Item" text="Buyers won't see it until you publish it again." action="Pause item"
      run={async () => { await setListingStatus(initial.id, "paused"); invalidate("/api/market/"); router.dismissTo("/market?tab=shop"); return true; }} />}
    {initial && initial.status !== "removed" && <Withdraw item={initial} />}
    {initial && <Confirm link label="Delete Item" text="Open orders keep their copy of this item." action="Delete item"
      run={async () => { await deleteListing(initial.id); invalidate("/api/market/"); router.dismissTo("/market?tab=shop"); return true; }} />}
  </>;
}
/** Safety withdrawal: the item leaves the Market, open orders with it are cancelled, and recent buyers get a notice. */
function Withdraw({ item }: { item: OwnListing }) {
  const { theme, setNotice } = usePreferences(), lot = item.kind === "prepacked";
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const label = lot ? "Withdraw Lot" : "Withdraw Item";
  const run = async () => {
    setBusy(true); setError("");
    try {
      const { notified } = await withdrawListing(item.id, reason.trim());
      invalidate("/api/market/"); setNotice({ text: notified ? `Withdrawn · ${notified} ${notified === 1 ? "buyer" : "buyers"} told` : "Withdrawn" });
      router.dismissTo("/market?tab=shop");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "That didn't work. Try again."); }
    finally { setBusy(false); }
  };
  return <><Button label={label} variant="link" onPress={() => setOpen(true)} />
    <MarketModal visible={open} onClose={() => setOpen(false)} label={label}>
      <T>{lot ? "Open orders with this lot are cancelled. Its buyers get a safety notice." : "Open orders with it are cancelled. Recent buyers get a safety notice."}</T>
      <Field label="Reason Shown To Buyers" placeholder={lot ? "Recalled by the maker" : "Wrong ingredient used"} value={reason} onChangeText={setReason} maxLength={200} editable={!busy} />
      {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={label} loading={busy} disabled={reason.trim().length < 3} onPress={() => void run()} />
      <Button label="Keep" variant="link" onPress={() => setOpen(false)} />
    </MarketModal></>;
}
