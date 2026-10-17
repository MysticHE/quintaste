import { useState } from "react";
import { View } from "react-native";
import { Chip } from "./food/Controls";
import { Button, Field, T } from "./ui";
import { FieldLabel, ThemedSwitch } from "./GroupedList";
import { MarketModal } from "./market/MarketChrome";
import { usePreferences } from "../state/Preferences";
import { report } from "../services/social-api";
import { ApiError } from "../services/community-api";

const reasons = {
  person: ["Harassment", "Spam or scam", "Inappropriate", "Safety concern", "Other"],
  listing: ["Prohibited item", "Misleading details", "Spam or scam", "Other"],
} as const;
/** Sends a report to the review queue; a person report can also block them. */
export function ReportSheet({ kind, targetId, name, visible, onClose, onBlocked }: {
  kind: "person" | "listing"; targetId: string; name: string; visible: boolean; onClose: () => void; onBlocked?: () => void;
}) {
  const { theme, setNotice } = usePreferences();
  const [reason, setReason] = useState(""), [details, setDetails] = useState(""), [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try {
      await report({ kind, targetId, reason, details, block: kind === "person" && block });
      setNotice({ text: "Report sent" }); setReason(""); setDetails(""); setBlock(false); onClose();
      if (block) onBlocked?.();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "The report was not sent. Try again."); }
    finally { setBusy(false); }
  };
  return <MarketModal visible={visible} onClose={() => { if (!busy) onClose(); }} label={"Report " + name}>
    <View style={{ gap: 6 }}><FieldLabel>Reason</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{reasons[kind].map(item =>
        <Chip key={item} label={item} compact role="radio" selected={reason === item} disabled={busy} onPress={() => setReason(item)} />)}</View></View>
    <Field label="Details (Optional)" value={details} onChangeText={setDetails} maxLength={1000} multiline editable={!busy} />
    {kind === "person" && <ThemedSwitch label={"Also block " + name} value={block} onChange={setBlock} disabled={busy} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Send Report" icon="flag-outline" loading={busy} disabled={!reason} onPress={() => void send()} />
  </MarketModal>;
}
