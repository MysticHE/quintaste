import { useState } from "react";
import { View } from "react-native";
import { Button, Card, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { useMinuteClock } from "../food/Timers";
import { usePreferences } from "../../state/Preferences";
import { dietSummary } from "../../config/preferences";
import { payLabels } from "../../types/meet";
import { formatSgShort } from "../../utils/sg-datetime";
import { suggestedSlots } from "../../utils/social-match";
import { respond, suggest } from "../../services/social-api";
import type { Group } from "../../types/community";
import { Action } from "./Shared";
import { FaceStack, PlaceThumb, SeatDots } from "./Face";
import { SlotPicker } from "./SlotPicker";
import { Sheet } from "./Sheet";

const replyBy = (at: string | null) => at ? "Reply by " + new Date(at).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", weekday: "short" }) : "";
/** An invitation at a glance: who, where, when, seats, who pays; then Accept, Suggest another slot or Not this time. */
export type Answer = "accepted" | "declined" | "suggested";
export function InvitationCard({ group: g, onAnswered }: { group: Group; onAnswered: (answer: Answer) => void }) {
  const now = useMinuteClock(), { setNotice } = usePreferences(), [suggesting, setSuggesting] = useState(false), [slot, setSlot] = useState("");
  const offer = g.offer, coming = g.members.filter(m => m.status === "accepted" || m.status === "invited" && !m.isMe), seats = g.members.filter(m => m.status === "accepted" || m.status === "invited").length;
  const answer = async (accept: boolean) => { await respond(g.id, accept); onAnswered(accept ? "accepted" : "declined"); };
  const send = async () => { if (!slot) throw new Error("Choose a time."); await suggest(g.id, slot); setSuggesting(false); setNotice({ text: "Suggestion sent" }); onAnswered("suggested"); };
  return <Card style={{ gap: 10 }}>
    <View style={{ alignSelf: "flex-start" }}><StatusPill label={g.expired ? "Expired" : offer?.suggested ? "You suggested " + formatSgShort(offer.suggested) : "Invitation"} tone={g.expired ? "muted" : "accent"} /></View>
    {offer?.starts ? <T variant="subtitle">{formatSgShort(offer.starts)}</T> : <T variant="subtitle">{"Group of " + g.size}</T>}
    {offer?.place && <View style={[common.row, { gap: 10 }]}><PlaceThumb place={offer.place} size={48} />
      <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold} numberOfLines={1}>{offer.place.name}</T>
        <T variant="small" muted numberOfLines={1}>{[offer.place.branch, offer.place.hours].filter(Boolean).join(" · ")}</T></View></View>}
    <View style={[common.row, { gap: 8 }]}><FaceStack people={coming} size={28} /><SeatDots taken={0} size={Math.max(0, g.size - seats)} />
      <T variant="small" style={common.bold}>{"Table of " + g.size + " · " + seats + " taken"}</T></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      <StatusPill label={payLabels[offer?.pay ?? g.pay]} />
      {g.listed && <StatusPill label={"Keeps " + dietSummary(g.diets)} />}
    </View>
    {g.expired ? <T muted>This invitation expired</T> : <>
      <Action label="Accept" run={() => answer(true)} />
      <Button label="Suggest Another Slot" icon="calendar-outline" variant="secondary" onPress={() => setSuggesting(true)} />
      <View style={common.spread}><T variant="small" muted>{replyBy(g.expiresAt)}</T><Button label="Not This Time" variant="link" onPress={() => void answer(false).catch(error => setNotice({ text: error instanceof Error ? error.message : "That did not send.", error: true }))} /></View>
    </>}
    <Sheet visible={suggesting} onClose={() => setSuggesting(false)} title="Suggest Another Slot" footer={<Action label="Send Suggestion" disabled={!slot} run={send} />}>
      <SlotPicker slots={suggestedSlots([], [], now)} value={slot} onChange={setSlot} />
    </Sheet>
  </Card>;
}
