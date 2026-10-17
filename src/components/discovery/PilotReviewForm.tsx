import { useState } from "react";
import { View } from "react-native";
import { Button, Field, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { pilotReviewLabels } from "../../config/pilot-catalogue";
import type { PilotReviewStatus, PilotVenueState } from "../../types/pilot-catalogue";

export type PilotReviewAction = (state: PilotVenueState, status: PilotReviewStatus, reason: string) => Promise<boolean>;
export function PilotReviewForm({ state, initialStatus, busy, save }: { state: PilotVenueState; initialStatus: PilotReviewStatus; busy: boolean; save: PilotReviewAction }) {
  const [status, setStatus] = useState<PilotReviewStatus>(state.review?.status ?? initialStatus);
  const [reason, setReason] = useState(""), [error, setError] = useState("");
  const submit = async () => {
    if (reason.trim().length < 3) { setError("Give a reason for this review."); return; }
    if (await save(state, status, reason.trim())) { setReason(""); setError(""); }
  };
  return <View style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">Local Review</T>
    <Chips label="Catalogue Review Status">{(Object.keys(pilotReviewLabels) as PilotReviewStatus[]).map(item => <Chip key={item}
      label={pilotReviewLabels[item]} role="radio" compact selected={status === item} disabled={busy} onPress={() => setStatus(item)} />)}</Chips>
    <Field label="Catalogue Review Reason" multiline maxLength={1000} value={reason} onChangeText={setReason} style={{ minHeight: 110, textAlignVertical: "top" }} />
    {!!error && <T variant="small" accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Save Catalogue Review" loading={busy} onPress={() => void submit()} />
    <T variant="caption" muted>This records a source review. It does not publish the entry or confirm ingredients.</T>
    {!!state.review && <View style={{ gap: 6 }}><T variant="small" style={common.bold}>Review history</T>
      {[...state.review.history].reverse().slice(0, 3).map((event, i) => <View key={i} style={{ gap: 3 }}>
        <T variant="small">{pilotReviewLabels[event.status]} · {new Date(event.at).toLocaleDateString("en-SG")}</T>
        <T variant="caption" muted>{event.reason}</T>
      </View>)}
    </View>}
  </View>;
}
