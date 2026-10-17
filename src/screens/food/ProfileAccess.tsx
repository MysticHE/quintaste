import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Card, Field, T, common } from "../../components/ui";
import { InfoBox } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { safeReturn } from "../../utils/navigation";

export function AgeCheckScreen() {
  const { pendingSignup, setPendingSignup, openPreview } = useFood(), { patch, theme } = usePreferences(), { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [day, setDay] = useState(""), [month, setMonth] = useState(""), [year, setYear] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const submit = async () => {
    const d = Number(day), m = Number(month), y = Number(year);
    const date = new Date(y, m - 1, d), now = new Date();
    if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year) ||
      y < 1900 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > now) {
      setError("Enter a valid date using day, month and four-digit year."); return;
    }
    const age = now.getFullYear() - y - (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d) ? 1 : 0);
    setDay(""); setMonth(""); setYear("");
    if (age < 18) { setPendingSignup(null); router.replace("/under-18"); return; }
    setBusy(true); setError("");
    try {
      const result = await openPreview(true);
      if (result) {
        if (pendingSignup?.name) patch({ displayName: pendingSignup.name });
        const destination = safeReturn(pendingSignup?.returnTo ?? returnTo);
        setPendingSignup(null);
        router.dismissTo(result.mergeCount ? { pathname: "/merge-saves", params: { returnTo: String(destination) } } : destination);
      }
    } finally { setBusy(false); }
  };
  return <Screen title="Date Of Birth" subtitle="For account eligibility. Your date is not stored.">
    <Card style={common.stack}>
      <Field label="Day" placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} autoComplete="off" />
      <Field label="Month" placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} autoComplete="off" />
      <Field label="Year" placeholder="YYYY" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} autoComplete="off" />
    </Card>
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <T variant="small" muted>Only the eligible-adult result is retained in the local profile. The date is discarded after this check.</T>
    <Button label="Continue" loading={busy} onPress={() => void submit()} />
    <Button label="Continue As Guest" variant="link" onPress={() => { setPendingSignup(null); router.dismissTo("/"); }} />
  </Screen>;
}
export function UnderAgeScreen() {
  return <Screen title="Continue With Food Discovery" back={false}>
    <InfoBox title="Account Creation Is Unavailable" text="Accounts in this pilot are for adults aged 18 or over. Your date of birth has been discarded. You can continue exploring and saving locally as a guest." />
    <Button label="Explore As Guest" onPress={() => router.dismissTo("/")} />
  </Screen>;
}
export function MergeSavesScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>(), { mergeGuest, clearMerge, readable } = useFood();
  const [busy, setBusy] = useState(false);
  const destination = safeReturn(returnTo);
  const merge = async () => {
    setBusy(true);
    try { if (await mergeGuest()) router.dismissTo(destination); } finally { setBusy(false); }
  };
  return <Screen title="Import Guest Data">
    <T>Copy saves and drafts from guest mode into this account on this device. Guest originals and existing account notes are kept.</T>
    <Button label="Import" disabled={!readable} loading={busy} onPress={() => void merge()} />
    <Button label="Not Now" variant="link" disabled={busy} onPress={() => { clearMerge(); router.dismissTo(destination); }} />
  </Screen>;
}
