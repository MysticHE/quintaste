import { useState } from "react";
import { View } from "react-native";
import { Chip } from "./food/Controls";
import { Button, Field, T } from "./ui";
import { FieldLabel, ThemedSwitch } from "./GroupedList";
import { MarketModal } from "./market/MarketChrome";
import { usePreferences } from "../state/Preferences";
import { report } from "../services/social-api";
import { ApiError } from "../services/community-api";
import { useT } from "../i18n";
import type commonMessages from "../i18n/en/common";

const reasons = {
  person: ["Not their photo", "Harassment", "Spam or scam", "Inappropriate", "Safety concern", "Other"],
  listing: ["Prohibited item", "Misleading details", "Spam or scam", "Other"],
  place: ["Hours", "Address or location", "Menu or prices", "Closed or moved", "Not meat-free", "Other"],
  recipe: ["Not meat-free", "Unsafe instructions", "Not their recipe", "Spam or scam", "Other"],
  level: ["Not meat-free", "Wrong ingredients", "Inappropriate", "Spam or scam", "Other"],
  cafe: ["Inappropriate name", "Spam or scam", "Harassment", "Other"],
} as const;
type Reason = (typeof reasons)[keyof typeof reasons][number];
/** The reason is sent as written above; this is only what the member reads. */
const reasonKeys: Record<Reason, keyof typeof commonMessages> = {
  "Not their photo": "reasonNotTheirPhoto", Harassment: "reasonHarassment", "Spam or scam": "reasonSpam", Inappropriate: "reasonInappropriate", "Safety concern": "reasonSafety",
  Other: "reasonOther", "Prohibited item": "reasonProhibited", "Misleading details": "reasonMisleading", Hours: "reasonHours",
  "Address or location": "reasonAddress", "Menu or prices": "reasonMenu", "Closed or moved": "reasonClosed", "Not meat-free": "reasonNotMeatFree",
  "Unsafe instructions": "reasonUnsafe", "Not their recipe": "reasonNotTheirs", "Wrong ingredients": "reasonWrongIngredients", "Inappropriate name": "reasonInappropriateName",
};
/** Sends a report to the staff review queue; a person report can also block them, a place report suggests an update. */
export function ReportSheet({ kind, targetId, name, visible, onClose, onBlocked, initialReason = "" }: {
  kind: keyof typeof reasons; targetId: string; name: string; visible: boolean; onClose: () => void; onBlocked?: () => void; initialReason?: string;
}) {
  const { theme, setNotice } = usePreferences(), t = useT("common");
  const [reason, setReason] = useState(initialReason), [details, setDetails] = useState(""), [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try {
      await report({ kind, targetId, reason, details, block: kind === "person" && block });
      setNotice({ text: kind === "place" ? t("sentToTeam") : t("reportSent") }); setReason(""); setDetails(""); setBlock(false); onClose();
      if (block) onBlocked?.();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("reportFailed")); }
    finally { setBusy(false); }
  };
  return <MarketModal visible={visible} onClose={() => { if (!busy) onClose(); }} label={t(kind === "place" ? "updateNamed" : "reportNamed", { name })}>
    <View style={{ gap: 6 }}><FieldLabel>{t("reportReason")}</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{reasons[kind].map(item =>
        <Chip key={item} label={t(reasonKeys[item])} compact role="radio" selected={reason === item} disabled={busy} onPress={() => setReason(item)} />)}</View></View>
    <Field label={t("reportDetails")} value={details} onChangeText={setDetails} maxLength={1000} multiline editable={!busy} />
    {kind === "person" && <ThemedSwitch label={t("alsoBlock", { name })} value={block} onChange={setBlock} disabled={busy} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={kind === "place" ? t("sendUpdate") : t("sendReport")} icon={kind === "place" ? "send-outline" : "flag-outline"} loading={busy} disabled={!reason} onPress={() => void send()} />
  </MarketModal>;
}
