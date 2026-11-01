import { router } from "expo-router";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Field, T } from "../../components/ui";
import { FormSection, SwitchRow } from "../../components/GroupedList";
import { CheckRow } from "../../components/recipes/CheckRow";
import { AreaField } from "../../components/market/AreaField";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { openShop, saveSeller, sellerState, type SellerInput } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { declarationKeys, declarationsVersion } from "../../config/market";
import { useT } from "../../i18n";
import type { SellerState } from "../../types/community";

export default function SellerSetupScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState), t = useT("market");
  return <Screen title={t("setupTitle")} backTo="/market?tab=shop">
    {!member ? <MemberPrompt icon="storefront-outline" returnTo="/market?tab=shop" /> : remote.data
      ? <Setup state={remote.data} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market?tab=shop" />}
  </Screen>;
}
const empty: SellerInput = { tradingName: "", about: "", area: "", meetup: true, delivery: false, deliveryFeeCents: 0, deliveryMinCents: 0, deliveryAreas: "", payCash: true, payPaynow: false };
/** Shop details, collection and payment. Opening needs the declarations this app shows; there is no staff review. */
function Setup({ state, refresh }: { state: SellerState; refresh: () => void }) {
  const { theme, setNotice } = usePreferences(), t = useT("market"), existing = state.seller, open = existing?.status === "active" && existing.declarationsVersion === declarationsVersion;
  const [form, setForm] = useState<SellerInput>(() => existing ? { ...empty, ...existing } : empty), [fee, setFee] = useState(existing?.deliveryFeeCents ? String(existing.deliveryFeeCents / 100) : "");
  const [minimum, setMinimum] = useState(existing?.deliveryMinCents ? String(existing.deliveryMinCents / 100) : "");
  const [agreed, setAgreed] = useState<number[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (patch: Partial<SellerInput>) => setForm(current => ({ ...current, ...patch }));
  // Fee and minimum are kept while delivery is switched off, so turning it back on restores them.
  const money = /^\d+(\.\d{1,2})?$/, feeInvalid = !!fee.trim() && !money.test(fee.trim());
  const minimumInvalid = !!minimum.trim() && (!money.test(minimum.trim()) || Number(minimum) > 1000);
  const input = (): SellerInput => ({ ...form, deliveryFeeCents: fee.trim() && !feeInvalid ? Math.round(Number(fee) * 100) : 0,
    deliveryMinCents: minimum.trim() && !minimumInvalid ? Math.round(Number(minimum) * 100) : 0 });
  const run = async (task: () => Promise<unknown>, done: string) => {
    if (feeInvalid) { setError(t("feeInvalid")); return false; }
    if (minimumInvalid) { setError(t("minimumInvalid")); return false; }
    setBusy(true); setError("");
    try { await task(); invalidate("/api/market/"); refresh(); setNotice({ text: done }); return true; }
    catch (problem) { setError(problem instanceof ApiError ? problem.message : t("saveFailed")); return false; }
    finally { setBusy(false); }
  };
  const save = () => run(() => saveSeller(input()), t("shopSaved"));
  const openNow = async () => { if (await run(async () => { await saveSeller(input()); await openShop(declarationsVersion); }, t("shopOpened"))) router.replace("/market?tab=shop"); };
  return <>
    <FormSection title={t("shop")}>
      <Field label={t("shopName")} value={form.tradingName} onChangeText={tradingName => set({ tradingName })} maxLength={60} editable={!busy} />
      <AreaField label={t("area")} placeholder={t("areaPlaceholder")} value={form.area} onChange={area => set({ area })} disabled={busy} />
      <Field label={t("aboutOptional")} value={form.about} onChangeText={about => set({ about })} maxLength={300} multiline editable={!busy} />
    </FormSection>
    <FormSection title={t("collection")}>
      <SwitchRow label={t("meetupCollection")} value={form.meetup} onChange={meetup => set({ meetup })} disabled={busy} />
      <SwitchRow label={t("deliveryAtDoor")} value={form.delivery} onChange={delivery => set({ delivery })} disabled={busy} />
      {form.delivery && <><Field label={t("deliveryFee")} value={fee} onChangeText={setFee} error={feeInvalid ? t("feeHint") : undefined} keyboardType="decimal-pad" maxLength={6} editable={!busy} />
        <Field label={t("deliveryMinimum")} placeholder={t("noMinimum")} value={minimum} onChangeText={setMinimum} error={minimumInvalid ? t("minimumHint") : undefined} keyboardType="decimal-pad" maxLength={7} editable={!busy} />
        <Field label={t("deliveryAreas")} placeholder={t("deliveryAreasPlaceholder")} value={form.deliveryAreas} onChangeText={deliveryAreas => set({ deliveryAreas })} maxLength={160} editable={!busy} /></>}
    </FormSection>
    <FormSection title={t("paymentAtCollection")}>
      <SwitchRow label={t("payCash")} value={form.payCash} onChange={payCash => set({ payCash })} disabled={busy} />
      <SwitchRow label={t("paynowInPerson")} value={form.payPaynow} onChange={payPaynow => set({ payPaynow })} disabled={busy} />
    </FormSection>
    {!open && <FormSection title={t("declarationsTitle")}>{declarationKeys.map((key, i) => <CheckRow key={key} label={t(key)} size="small" checked={agreed.includes(i)} disabled={busy}
      onPress={() => setAgreed(current => current.includes(i) ? current.filter(x => x !== i) : [...current, i])} />)}</FormSection>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {!open && <Button label={t("openShop")} icon="storefront-outline" loading={busy} disabled={agreed.length < declarationKeys.length} onPress={() => void openNow()} />}
    <Button label={t(open ? "saveChanges" : "saveDraft")} variant={open ? "primary" : "secondary"} disabled={busy} onPress={() => void save()} />
  </>;
}
