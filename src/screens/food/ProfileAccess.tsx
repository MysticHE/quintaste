import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Card, Field, T, common } from "../../components/ui";
import { InfoBox } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { safeReturn } from "../../utils/navigation";
import { useT } from "../../i18n";

export function AgeCheckScreen() {
  const { pendingSignup, setPendingSignup, openPreview } = useFood(), { patch, theme } = usePreferences(), { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [day, setDay] = useState(""), [month, setMonth] = useState(""), [year, setYear] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), t = useT("me"), tc = useT("common");
  const submit = async () => {
    const d = Number(day), m = Number(month), y = Number(year);
    const date = new Date(y, m - 1, d), now = new Date();
    if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year) ||
      y < 1900 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > now) {
      setError(t("invalidDate")); return;
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
  return <Screen title={t("dateOfBirthTitle")} subtitle={t("dobSubtitle")}>
    <Card style={common.stack}>
      <Field label={t("day")} placeholder={t("dayPlaceholder")} keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} autoComplete="off" />
      <Field label={t("month")} placeholder={t("monthPlaceholder")} keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} autoComplete="off" />
      <Field label={t("year")} placeholder={t("yearPlaceholder")} keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} autoComplete="off" />
    </Card>
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <T variant="small" muted>{t("dobRetention")}</T>
    <Button label={tc("continue")} loading={busy} onPress={() => void submit()} />
    <Button label={t("continueAsGuest")} variant="link" onPress={() => { setPendingSignup(null); router.dismissTo("/"); }} />
  </Screen>;
}
export function UnderAgeScreen() {
  const t = useT("me");
  return <Screen title={t("continueDiscovery")} back={false}>
    <InfoBox title={t("accountUnavailable")} text={t("underAgeNote")} />
    <Button label={t("exploreAsGuest")} onPress={() => router.dismissTo("/")} />
  </Screen>;
}
export function MergeSavesScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>(), { mergeGuest, clearMerge, readable } = useFood();
  const [busy, setBusy] = useState(false), t = useT("me");
  const destination = safeReturn(returnTo);
  const merge = async () => {
    setBusy(true);
    try { if (await mergeGuest()) router.dismissTo(destination); } finally { setBusy(false); }
  };
  return <Screen title={t("bringInGuestSaves")}>
    <T>{t("mergeNote")}</T>
    <Button label={t("importSaves")} disabled={!readable} loading={busy} onPress={() => void merge()} />
    <Button label={t("notNow")} variant="link" disabled={busy} onPress={() => { clearMerge(); router.dismissTo(destination); }} />
  </Screen>;
}
