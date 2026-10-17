import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { FormSection, ThemedSwitch } from "../../components/GroupedList";
import { CheckRow } from "../../components/recipes/CheckRow";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { openShop, saveSeller, sellerState, type SellerInput } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { declarations, declarationsVersion } from "../../config/market";
import type { SellerState } from "../../types/community";

export default function SellerSetupScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/seller" : null, sellerState);
  return <Screen title="Shop Setup" hideTimers backTo="/market/my-shop">
    {!member ? <MemberPrompt icon="storefront-outline" returnTo="/market/my-shop" /> : remote.data
      ? <Setup state={remote.data} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="storefront-outline" returnTo="/market/my-shop" />}
  </Screen>;
}
const empty: SellerInput = { tradingName: "", about: "", area: "", meetup: true, delivery: false, deliveryFeeCents: 0, deliveryAreas: "", payCash: true, payPaynow: false };
function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return <View style={[common.spread, { minHeight: 48 }]}><T>{label}</T><ThemedSwitch label={label} value={value} onChange={onChange} disabled={disabled} /></View>;
}
/** Shop details, collection and payment. Opening needs the declarations this app shows; there is no staff review. */
function Setup({ state, refresh }: { state: SellerState; refresh: () => void }) {
  const { theme, setNotice } = usePreferences(), existing = state.seller, open = existing?.status === "active" && existing.declarationsVersion === declarationsVersion;
  const [form, setForm] = useState<SellerInput>(() => existing ? { ...empty, ...existing } : empty), [fee, setFee] = useState(existing?.deliveryFeeCents ? String(existing.deliveryFeeCents / 100) : "");
  const [agreed, setAgreed] = useState<number[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (patch: Partial<SellerInput>) => setForm(current => ({ ...current, ...patch }));
  const feeInvalid = form.delivery && !!fee.trim() && !/^\d+(\.\d{1,2})?$/.test(fee.trim());
  const input = (): SellerInput => ({ ...form, deliveryFeeCents: form.delivery && fee.trim() && !feeInvalid ? Math.round(Number(fee) * 100) : 0 });
  const run = async (task: () => Promise<unknown>, done: string) => {
    if (feeInvalid) { setError("Enter the delivery fee in dollars, for example 3.50."); return false; }
    setBusy(true); setError("");
    try { await task(); invalidate("/api/market/"); refresh(); setNotice({ text: done }); return true; }
    catch (problem) { setError(problem instanceof ApiError ? problem.message : "That didn't save. Try again."); return false; }
    finally { setBusy(false); }
  };
  const save = () => run(() => saveSeller(input()), "Shop saved");
  const openNow = async () => { if (await run(async () => { await saveSeller(input()); await openShop(declarationsVersion); }, "Your shop is open")) router.replace("/market/my-shop"); };
  return <>
    <FormSection title="Shop">
      <Field label="Shop Name" value={form.tradingName} onChangeText={tradingName => set({ tradingName })} maxLength={60} editable={!busy} />
      <Field label="Area" placeholder="e.g. Tampines" value={form.area} onChangeText={area => set({ area })} maxLength={60} editable={!busy} />
      <Field label="About (Optional)" value={form.about} onChangeText={about => set({ about })} maxLength={300} multiline editable={!busy} />
    </FormSection>
    <FormSection title="Collection">
      <Toggle label="Meetup collection" value={form.meetup} onChange={meetup => set({ meetup })} disabled={busy} />
      <Toggle label="Delivery, paid at the door" value={form.delivery} onChange={delivery => set({ delivery })} disabled={busy} />
      {form.delivery && <><Field label="Delivery Fee (S$)" value={fee} onChangeText={setFee} error={feeInvalid ? "Use a number like 3.50" : undefined} keyboardType="decimal-pad" maxLength={6} editable={!busy} />
        <Field label="Delivery Areas" placeholder="e.g. Tampines, Pasir Ris" value={form.deliveryAreas} onChangeText={deliveryAreas => set({ deliveryAreas })} maxLength={160} editable={!busy} /></>}
    </FormSection>
    <FormSection title="Payment at collection">
      <Toggle label="Cash" value={form.payCash} onChange={payCash => set({ payCash })} disabled={busy} />
      <Toggle label="PayNow, in person" value={form.payPaynow} onChange={payPaynow => set({ payPaynow })} disabled={busy} />
    </FormSection>
    {!open && <FormSection title="Declarations">{declarations.map((line, i) => <CheckRow key={line} label={line} size="small" checked={agreed.includes(i)} disabled={busy}
      onPress={() => setAgreed(current => current.includes(i) ? current.filter(x => x !== i) : [...current, i])} />)}</FormSection>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {!open && <Button label="Open Shop" icon="storefront-outline" loading={busy} disabled={agreed.length < declarations.length} onPress={() => void openNow()} />}
    <Button label={open ? "Save Changes" : "Save Draft"} variant={open ? "primary" : "secondary"} disabled={busy} onPress={() => void save()} />
  </>;
}
