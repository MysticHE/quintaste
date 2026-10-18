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
  place: ["Hours", "Address or location", "Menu or prices", "Closed or moved", "Not vegetarian", "Other"],
  recipe: ["Not vegetarian", "Unsafe instructions", "Not their recipe", "Spam or scam", "Other"],
} as const;
/** Sends a report to the staff review queue; a person report can also block them, a place report suggests an update. */
export function ReportSheet({ kind, targetId, name, visible, onClose, onBlocked, initialReason = "" }: {
  kind: keyof typeof reasons; targetId: string; name: string; visible: boolean; onClose: () => void; onBlocked?: () => void; initialReason?: string;
}) {
  const { theme, setNotice } = usePreferences();
  const [reason, setReason] = useState(initialReason), [details, setDetails] = useState(""), [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try {
      await report({ kind, targetId, reason, details, block: kind === "person" && block });
      setNotice({ text: kind === "place" ? "Sent to the QuinTaste team" : "Report sent" }); setReason(""); setDetails(""); setBlock(false); onClose();
      if (block) onBlocked?.();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "The report was not sent. Try again."); }
    finally { setBusy(false); }
  };
  return <MarketModal visible={visible} onClose={() => { if (!busy) onClose(); }} label={(kind === "place" ? "Update " : "Report ") + name}>
    <View style={{ gap: 6 }}><FieldLabel>Reason</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{reasons[kind].map(item =>
        <Chip key={item} label={item} compact role="radio" selected={reason === item} disabled={busy} onPress={() => setReason(item)} />)}</View></View>
    <Field label="Details (Optional)" value={details} onChangeText={setDetails} maxLength={1000} multiline editable={!busy} />
    {kind === "person" && <ThemedSwitch label={"Also block " + name} value={block} onChange={setBlock} disabled={busy} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={kind === "place" ? "Send Update" : "Send Report"} icon={kind === "place" ? "send-outline" : "flag-outline"} loading={busy} disabled={!reason} onPress={() => void send()} />
  </MarketModal>;
}
