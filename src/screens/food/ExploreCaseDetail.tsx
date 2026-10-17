import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Card, Field, T, common } from "../../components/ui";
import { useFood } from "../../state/Food";
import { useExploreLocal } from "../../state/ExploreLocal";
import { usePreferences } from "../../state/Preferences";
import { caseStatusLabel } from "../../config/explore-local";
import type { CaseDetail } from "../../types/explore-local";
import { MenuCorrectionSummary } from "../../components/discovery/MenuCorrectionSummary";

export function ExploreCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), { doc, owner } = useFood(), { cases, offline } = useExploreLocal();
  const receipt = doc.exploreLocal.receipts.find(item => item.caseId === id), { theme } = usePreferences();
  const [loaded, setLoaded] = useState<CaseDetail | null>(null), [reply, setReply] = useState(""), [error, setError] = useState("");
  const { refresh, details } = cases, caseId = receipt?.caseId, revision = receipt?.revision;
  useFocusEffect(useCallback(() => { if (!offline && __DEV__) void refresh(); }, [offline, refresh]));
  useEffect(() => {
    if (offline || !caseId || !__DEV__) return;
    const controller = new AbortController();
    void details(caseId, controller.signal).then(value => { if (!controller.signal.aborted) setLoaded(value); })
      .catch(() => { if (!controller.signal.aborted) setError("Current case details unavailable. Retry from My cases."); });
    return () => controller.abort();
  }, [id, revision, caseId, details, offline, owner]);
  const send = async () => {
    if (!receipt || reply.trim().length < 3) { setError("Add the requested information."); return; }
    if (await cases.reply(receipt, reply.trim())) { setReply(""); setError(""); }
  };
  return <Screen title={receipt?.reference ?? "Case details"}>
    {!receipt ? <T muted>Case unavailable in this collection</T> : <>
      <T variant="subtitle">{receipt.target}</T><T variant="caption" muted>{offline ? "Offline · last received status" : "Local review"}</T>
      <Button label="Refresh Case" icon="refresh-outline" variant="link" loading={cases.busy} disabled={offline || !__DEV__} onPress={() => void cases.refresh()} />
      <Card style={common.stack}><T style={common.bold}>{caseStatusLabel[receipt.status]}</T><T>{receipt.category}</T>
        <MenuCorrectionSummary change={receipt.menuChange} />
        <T selectable>{receipt.details}</T>{!!receipt.source && <T variant="small" muted>{receipt.source}</T>}
        <T variant="small" muted>{receipt.observedOn}</T>
        {!!loaded?.photoUri && <Image source={{ uri: loaded.photoUri }} accessibilityLabel="Submitted evidence" style={{ width: "100%", height: 220, borderRadius: 16 }} resizeMode="contain" />}
        {!!receipt.reason && <T>{receipt.reason}</T>}
      </Card>
      <T variant="subtitle" accessibilityRole="header">Updates</T>
      {[...receipt.history].reverse().map((event, index) => <Card key={index} style={{ gap: 6 }}>
        <T style={common.bold}>{caseStatusLabel[event.status]}</T><T>{event.reason}</T>
        <T variant="caption" muted>{new Date(event.at).toLocaleString("en-SG")}</T>
      </Card>)}
      {receipt.status === "needs-information" && <>
        <Field label="Additional Information" multiline maxLength={2000} value={reply} onChangeText={setReply} style={{ minHeight: 110, textAlignVertical: "top" }} />
        <Button label="Send Information" disabled={offline} loading={cases.busy} onPress={() => void send()} />
      </>}
    </>}
    {!!(error || cases.error) && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error || cases.error}</T>}
  </Screen>;
}
