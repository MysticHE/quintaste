import { useState } from "react";
import { Image, View } from "react-native";
import { Button, Card, Field, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { caseStatusLabel } from "../../config/explore-local";
import type { CaseReceipt, CaseStatus } from "../../types/explore-local";
import { MenuCorrectionSummary } from "./MenuCorrectionSummary";

export function LocalReviewCase({ item, busy, update, photo }: {
  item: CaseReceipt; busy: boolean; update: (item: CaseReceipt, status: CaseStatus, reason: string) => Promise<boolean>;
  photo: (id: string) => Promise<string | undefined>;
}) {
  const [editing, setEditing] = useState(false), [status, setStatus] = useState<CaseStatus>("needs-information");
  const [reason, setReason] = useState(""), [image, setImage] = useState<string>(), [error, setError] = useState("");
  const decide = async () => {
    if (reason.trim().length < 3) { setError("Give a reason for this decision."); return; }
    if (await update(item, status, reason.trim())) { setEditing(false); setReason(""); setError(""); }
  };
  return <Card style={common.stack}>
    <View style={common.spread}><T style={common.bold}>{item.reference}</T><T variant="small" muted>{caseStatusLabel[item.status]}</T></View>
    <T variant="subtitle">{item.target}</T><T variant="small" muted>{item.category}{["Food safety", "Closed or moved"].includes(item.category) ? " · Priority" : ""}</T>
    <MenuCorrectionSummary change={item.menuChange} />
    {!!item.details && <T selectable>{item.details}</T>}{!!item.source && <T variant="small" muted>{item.source}</T>}
    <T variant="small" muted>{item.observedOn}</T>{!!item.reason && <T>{item.reason}</T>}
    {!!item.hasPhoto && <Button label="View Evidence Photo" variant="secondary" disabled={busy} onPress={() => void photo(item.caseId).then(setImage)} />}
    {!!image && <Image source={{ uri: image }} accessibilityLabel="Case evidence" style={{ width: "100%", height: 240, borderRadius: 16 }} resizeMode="contain" />}
    {editing ? <>
      <Chips label={"Review status " + item.reference}>{(["needs-information", "approved", "declined"] as const).map(value => <Chip key={value}
        label={caseStatusLabel[value]} role="radio" compact selected={status === value} onPress={() => setStatus(value)} />)}</Chips>
      <Field label="Review Reason" value={reason} maxLength={1000} multiline onChangeText={setReason} style={{ minHeight: 100, textAlignVertical: "top" }} />
      {!!error && <T variant="small" accessibilityLiveRegion="polite">{error}</T>}
      <Button label="Save Review Decision" loading={busy} onPress={() => void decide()} />
      <Button label="Cancel Review" variant="link" disabled={busy} onPress={() => setEditing(false)} />
    </> : <Button label="Review Case" accessibilityLabel={"Review " + item.reference} variant="secondary" disabled={busy} onPress={() => setEditing(true)} />}
  </Card>;
}
