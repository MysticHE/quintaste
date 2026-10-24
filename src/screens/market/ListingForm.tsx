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
import { marketLimits, shopCategories } from "../../config/market";
import { dietWarnings, draftFrom, draftLabels, listingErrors, listingInput, type ListingDraft } from "../../utils/market";
import { dayAfter } from "../../utils/day";
import { useT } from "../../i18n";
import type { OwnListing, SellerProfile, ShopPhotoSlot } from "../../types/community";

export default function ListingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(), { member } = useMember(), t = useT("market"), title = t(id ? "editItem" : "newItem");
  const shop = useRemote(member ? "/api/market/seller" : null, sellerState);
  const item = useRemote(member && id ? "/api/market/seller/listings/" + id : null, signal => ownListing(id ?? "", signal));
  const seller = shop.data?.seller;
  return <Screen title={title} hideTimers backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="storefront-outline" returnTo="/market?tab=shop" />
      : !shop.data ? <RemoteStatus remote={shop} icon="storefront-outline" returnTo="/market?tab=shop" />
      : !seller ? <EmptyState title={t("setUpShopFirst")} text="" icon="storefront-outline" primary={{ label: t("setUpShop"), onPress: () => router.replace("/market?tab=shop") }} />
      : id && !item.data ? <RemoteStatus remote={item} icon="pricetags-outline" returnTo="/market?tab=shop" missing={t("itemUnavailable")} />
      : <ListingForm key={id ?? "new"} initial={id ? item.data : undefined} seller={seller} />}
  </Screen>;
}
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
  const { theme, setNotice } = usePreferences(), t = useT("market");
  const [d, setDraft] = useState(() => draftFrom(initial)), now = useMinuteClock();
  const kinds = [{ id: "made", label: t("kindMade") }, { id: "prepacked", label: t("kindPrepacked") }] as const;
  const [attempted, setAttempted] = useState<boolean>(), [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [failure, setFailure] = useState("");
  const locked = busy || photoBusy, live = initial?.status === "active", canPublish = seller.status === "active" && initial?.status !== "removed";
  const errors = attempted === undefined ? {} : listingErrors(d, attempted, now, t), warnings = dietWarnings(d, t);
  const set = (patch: Partial<ListingDraft>) => setDraft(current => ({ ...current, ...patch }));
  const save = async (publish: boolean) => {
    if (locked) return;
    setAttempted(publish); setFailure("");
    if (Object.keys(listingErrors(d, publish, Date.now(), t)).length) return;
    setBusy(true);
    try {
      await saveListing(initial?.id ?? null, { listing: listingInput(d), photos: photoChanges(d, initial), publish });
      invalidate("/api/market/");
      setNotice({ text: t(publish ? (live ? "changesSaved" : "itemIsLive") : "draftSaved") });
      router.dismissTo("/market?tab=shop");
    } catch (error) { setFailure(error instanceof ApiError ? error.message : t("itemSaveFailed")); }
    finally { setBusy(false); }
  };
  const slots: ShopPhotoSlot[] = d.kind === "prepacked" ? ["item", "label"] : ["item", "detail"];
  return <>
    {initial?.status === "removed" && <T color={theme.warning}>{t("itemRemovedBy", { reason: initial.removedReason })}</T>}
    <View style={common.row}><SegmentedTabs options={kinds} value={d.kind} onChange={kind => set({ kind })} label={t("itemType")} /></View>
    <FormSection title={t("photos")}>
      <ListingPhotos slots={slots} value={d.photos} disabled={locked} onBusy={setPhotoBusy} error={errors.photos} budget={photoBudgets.upload} onChange={photos => set({ photos })} />
    </FormSection>
    <FormSection title={t("details")}>
      <Field label={t("itemField")} placeholder={t("itemPlaceholder")} value={d.name} onChangeText={name => set({ name })} maxLength={80} error={errors.name} editable={!locked} />
      <View style={{ gap: 6 }}><FieldLabel>{t("category")}</FieldLabel><Chips label={t("category")}>{shopCategories.map(c => <Chip key={c.id} label={t(c.label)} role="radio" compact
        selected={d.category === c.id} disabled={locked} onPress={() => set({ category: c.id })} />)}</Chips></View>
      <View style={[common.row, { alignItems: "flex-start", gap: 8 }]}>
        <View style={common.flex}><Field label={t("price")} value={d.price} onChangeText={price => set({ price })} keyboardType="decimal-pad" maxLength={7} error={errors.price} editable={!locked} /></View>
        <View style={common.flex}><Field label={t("portion")} placeholder={t("portionPlaceholder")} value={d.portion} onChangeText={portion => set({ portion })} maxLength={40} error={errors.portion} editable={!locked} /></View>
      </View>
      <Field label={t("descriptionOptional")} value={d.description} onChangeText={description => set({ description })} maxLength={500} multiline editable={!locked} />
    </FormSection>
    <FormSection title={t("foodFacts")}>
      <Field label={t("ingredients")} placeholder={t("ingredientsPlaceholder")} value={d.ingredients} multiline error={errors.ingredients}
        editable={!locked} onChangeText={ingredients => set({ ingredients })} />
      <View style={{ gap: 6 }}><FieldLabel>{t("allergens")}</FieldLabel><AllergenEditor value={d.info} disabled={locked} onChange={info => set({ info })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>{t("dietLabels")}</FieldLabel><DietPills labels={draftLabels(d)} practices={d.diets} /></View>
      <View style={{ gap: 6 }}><FieldLabel>{t("practicesOptional")}</FieldLabel><DietChoices value={d.diets} onChange={diets => set({ diets })} disabled={locked} warnings={warnings} error={errors.diets} /></View>
      <Field label={t("storage")} placeholder={t("storagePlaceholder")} value={d.storage} onChangeText={storage => set({ storage })} maxLength={200} error={errors.storage} editable={!locked} />
      {d.kind === "prepacked" && <>
        <DateField label={t("dateMarkField")} value={d.dateMark} minimum={dayAfter(now, 1)} error={errors.dateMark} disabled={locked} onChange={dateMark => set({ dateMark })} />
        <Field label={t("lotField")} value={d.lot} onChangeText={lot => set({ lot })} maxLength={40} error={errors.lot} editable={!locked} />
      </>}
    </FormSection>
    <FormSection title={t("ordering")}>
      <View style={{ gap: 6 }}><FieldLabel>{t("orderAheadField")}</FieldLabel><Chips label={t("orderAheadGroup")}>{leadChoices.map(days => <Chip key={days} label={days ? t("leadDays", { n: days }) : t("sameDay")}
        role="radio" compact selected={d.leadDays === days} disabled={locked} onPress={() => set({ leadDays: days })} />)}</Chips></View>
      <Field label={t("mostPerOrder", { limit: marketLimits.perOrder })} value={d.maxPerOrder} onChangeText={maxPerOrder => set({ maxPerOrder })} keyboardType="number-pad" maxLength={2} error={errors.maxPerOrder} editable={!locked} />
      <Field label={t("mostPerCollection")} placeholder={t("noLimit")} value={d.perSlot} onChangeText={perSlot => set({ perSlot })} keyboardType="number-pad" maxLength={3} error={errors.perSlot} editable={!locked} />
    </FormSection>
    {!!(failure || Object.keys(errors).length) && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{failure || t("completeFields")}</T>}
    {canPublish && <Button label={t(live ? "saveChanges" : "publish")} disabled={photoBusy} loading={busy} onPress={() => void save(true)} />}
    {!live && <Button label={t("saveDraft")} variant={canPublish ? "secondary" : "primary"} disabled={locked} onPress={() => void save(false)} />}
    {!canPublish && seller.status !== "active" && <T variant="small" muted style={common.center}>{t("openToPublish")}</T>}
    {live && initial && <Confirm link label={t("pauseItem")} text={t("pauseText")} action={t("pauseAction")}
      run={async () => { await setListingStatus(initial.id, "paused"); invalidate("/api/market/"); router.dismissTo("/market?tab=shop"); return true; }} />}
    {initial && initial.status !== "removed" && <Withdraw item={initial} />}
    {initial && <Confirm link label={t("deleteItem")} text={t("deleteText")} action={t("deleteAction")}
      run={async () => { await deleteListing(initial.id); invalidate("/api/market/"); router.dismissTo("/market?tab=shop"); return true; }} />}
  </>;
}
/** Safety withdrawal: the item leaves the Market, open orders with it are cancelled, and recent buyers get a notice. */
function Withdraw({ item }: { item: OwnListing }) {
  const { theme, setNotice } = usePreferences(), lot = item.kind === "prepacked", t = useT("market");
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const label = t(lot ? "withdrawLot" : "withdrawItem");
  const run = async () => {
    setBusy(true); setError("");
    try {
      const { notified } = await withdrawListing(item.id, reason.trim());
      invalidate("/api/market/"); setNotice({ text: notified ? t("withdrawnTold", { n: notified }) : t("withdrawn") });
      router.dismissTo("/market?tab=shop");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("tryAgainAction")); }
    finally { setBusy(false); }
  };
  return <><Button label={label} variant="link" onPress={() => setOpen(true)} />
    <MarketModal visible={open} onClose={() => setOpen(false)} label={label}>
      <T>{t(lot ? "withdrawLotText" : "withdrawItemText")}</T>
      <Field label={t("reasonToBuyers")} placeholder={t(lot ? "withdrawLotPlaceholder" : "withdrawItemPlaceholder")} value={reason} onChangeText={setReason} maxLength={200} editable={!busy} />
      {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={label} loading={busy} disabled={reason.trim().length < 3} onPress={() => void run()} />
      <Button label={t("keep")} variant="link" onPress={() => setOpen(false)} />
    </MarketModal></>;
}
