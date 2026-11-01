import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button, T } from "../components/ui";
import { ListGroup, SwitchRow } from "../components/GroupedList";
import { useRemote, setRemoteData } from "../hooks/useRemote";
import { disablePush, enablePush, loadPushSettings, pushKinds, pushSettingsKey, pushState, pushSupport, savePushSettings, type PushKind } from "../services/push";
import { useAuth } from "../state/Auth";
import { usePreferences } from "../state/Preferences";
import { useLanguage, useT } from "../i18n";
import type meMessages from "../i18n/en/me";

/**
 * Settings › Phone alerts: alerts on this phone on or off, then which kinds (messages, friend requests, gifts, dinner
 * invites, orders), kept on the server for every phone the member uses. Android Expo Go can't receive them.
 */
export function PhoneAlertsScreen() {
  const t = useT("me"), tc = useT("cook"), { user } = useAuth(), language = useLanguage(), { theme } = usePreferences(), support = pushSupport();
  const [on, setOn] = useState<boolean | null>(null), [busy, setBusy] = useState(false), [problem, setProblem] = useState<"" | "denied" | "failed" | "save">("");
  const settings = useRemote(user && on ? pushSettingsKey : null, loadPushSettings), off = settings.data?.off ?? [];
  const userId = user?.id;
  // Turned on here but blocked in the phone's settings shows off, with the way to fix it.
  useEffect(() => {
    if (!userId) return;
    pushState(userId).then(state => { setOn(state === "on"); if (state === "blocked") setProblem("denied"); }, () => setOn(false));
  }, [userId]);
  if (!userId) return <Screen title={t("phoneAlerts")} />;
  const toggle = async (next: boolean) => {
    setBusy(true); setProblem("");
    try {
      if (!next) { await disablePush(userId); setOn(false); return; }
      const result = await enablePush(userId, language);
      if (result === "on") setOn(true); else setProblem(result);
    } catch { setProblem("failed"); }
    finally { setBusy(false); }
  };
  const choose = async (kind: PushKind, value: boolean) => {
    const before = off, after = value ? off.filter(k => k !== kind) : [...off, kind];
    setProblem("");
    if (settings.data) setRemoteData(pushSettingsKey, { ...settings.data, off: after });
    try { await savePushSettings(after); }
    catch { if (settings.data) setRemoteData(pushSettingsKey, { ...settings.data, off: before }); setProblem("save"); }
  };
  const message = problem === "denied" ? t("pushDenied") : problem === "failed" ? t("pushFailed") : problem === "save" ? t("pushSaveFailed") : "";
  return <Screen title={t("phoneAlerts")}>
    {support !== "ok" ? <T muted>{t("pushStoreApp")}</T> : <>
      <ListGroup><View style={{ paddingHorizontal: 14 }}>
        <SwitchRow label={t("pushThisPhone")} value={!!on} onChange={toggle} disabled={busy || on === null} bold />
      </View></ListGroup>
      {!!message && <View style={{ gap: 4 }}>
        <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{message}</T>
        {problem === "denied" && <View style={{ alignSelf: "flex-start" }}><Button label={tc("phoneSettings")} variant="link" onPress={() => void Linking.openSettings()} /></View>}
      </View>}
      {on && settings.data && <ListGroup><View style={{ paddingHorizontal: 14 }}>
        {pushKinds.map(kind => <SwitchRow key={kind} label={t(("push_" + kind) as keyof typeof meMessages)} value={!off.includes(kind)} onChange={value => void choose(kind, value)} />)}
      </View></ListGroup>}
    </>}
  </Screen>;
}
