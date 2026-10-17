import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { Button, Card, T, common } from "../ui";
import { useFood } from "../../state/Food";
import { useExploreLocal } from "../../state/ExploreLocal";
import { caseStatusLabel } from "../../config/explore-local";
import { usePreferences } from "../../state/Preferences";
import { MenuCorrectionSummary } from "./MenuCorrectionSummary";
import { IconButton } from "../food/Controls";

export function ExploreCaseList() {
  const { doc } = useFood(), { cases, offline } = useExploreLocal(), { theme } = usePreferences();
  const { drafts, receipts } = doc.exploreLocal;
  const { refresh } = cases;
  useFocusEffect(useCallback(() => { if (!offline && __DEV__) void refresh(); }, [offline, refresh]));
  return <View style={common.stack}>
    <View style={common.spread}><T variant="subtitle" accessibilityRole="header">Place Cases</T>
      <IconButton label="Refresh Cases" icon="refresh-outline" loading={cases.busy} disabled={offline || !__DEV__} onPress={() => void cases.refresh()} /></View>
    <T variant="caption" muted>{offline ? "Offline · saved on this device" : "Local review"}</T>
    {!!cases.error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{cases.error}</T>}
    {!drafts.length && !receipts.length && <T muted>No place submissions yet</T>}
    {drafts.map(draft => <Card key={draft.id} style={common.stack}>
      <T variant="subtitle" numberOfLines={2}>{draft.target}</T>
      <T variant="small" muted>{draft.category} · {draft.delivery === "queued" ? "Queued" : "Draft"}</T>
      <MenuCorrectionSummary change={draft.menuChange} />
      {(!!draft.details || !draft.menuChange) && <T numberOfLines={3}>{draft.details || "Add details"}</T>}
      {draft.delivery === "draft" ? <Button label="Continue Draft" variant="secondary" onPress={() => router.push({
        pathname: "/contribute", params: { placeId: draft.placeId, target: draft.target, kind: draft.kind, draftId: draft.id },
      })} /> : <Button label="Retry Queued Submissions" variant="secondary" disabled={offline} loading={cases.busy} onPress={() => void cases.refresh()} />}
      <Button label={draft.delivery === "queued" ? "Cancel Queued Submission" : "Delete Place Draft"} variant="link" onPress={() => void cases.removeDraft(draft.id)} />
    </Card>)}
    {receipts.map(receipt => <Card key={receipt.caseId} style={common.stack}>
      <View style={common.spread}><T variant="small" style={common.bold}>{caseStatusLabel[receipt.status]}</T>
        <T variant="caption" muted>{receipt.reference}</T></View>
      <T variant="subtitle" numberOfLines={2}>{receipt.target}</T>
      <T variant="small" muted>{receipt.category}</T>
      <MenuCorrectionSummary change={receipt.menuChange} />
      {!!receipt.reason && <T numberOfLines={3}>{receipt.reason}</T>}
      <Button label="View Case" accessibilityLabel={"View case " + receipt.reference} variant="secondary"
        onPress={() => router.push({ pathname: "/explore-case/[id]", params: { id: receipt.caseId } } as never)} />
    </Card>)}
  </View>;
}
