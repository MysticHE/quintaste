import { useState } from "react";
import { View } from "react-native";
import { Button, Card, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { useMinuteClock } from "../food/Timers";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT, type Language } from "../../i18n";
import { formatSgShort, sgDateTile, sgDateTimeText } from "../../utils/sg-datetime";
import { suggestedSlots } from "../../utils/social-match";
import { respond, suggest } from "../../services/social-api";
import type { Group } from "../../types/community";
import { Action } from "./Shared";
import { useDietSummary } from "./MeetUI";
import { FaceStack, PlaceThumb, SeatDots } from "./Face";
import { SlotPicker } from "./SlotPicker";
import { Sheet } from "./Sheet";

const replyDay = (at: string, language: Language) => language === "zh" ? sgDateTile(sgDateTimeText(Date.parse(at)), language)?.weekday ?? ""
  : new Date(at).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", weekday: "short" });
/** An invitation at a glance: who, where, when, seats, who pays; then Accept, Suggest another slot or Not this time. */
export type Answer = "accepted" | "declined" | "suggested";
export function InvitationCard({ group: g, onAnswered }: { group: Group; onAnswered: (answer: Answer) => void }) {
  const now = useMinuteClock(), { setNotice } = usePreferences(), t = useT("social"), language = useLanguage(), dietSummary = useDietSummary(), [suggesting, setSuggesting] = useState(false), [slot, setSlot] = useState("");
  const offer = g.offer, coming = g.members.filter(m => m.status === "accepted" || m.status === "invited" && !m.isMe), seats = g.members.filter(m => m.status === "accepted" || m.status === "invited").length;
  const answer = async (accept: boolean) => { await respond(g.id, accept); onAnswered(accept ? "accepted" : "declined"); };
  const send = async () => { if (!slot) throw new Error(t("chooseTime")); await suggest(g.id, slot); setSuggesting(false); setNotice({ text: t("suggestionSent") }); onAnswered("suggested"); };
  return <Card style={{ gap: 10 }}>
    <View style={{ alignSelf: "flex-start" }}><StatusPill label={g.expired ? t("expired") : offer?.suggested ? t("youSuggested", { time: formatSgShort(offer.suggested, language) }) : t("invitation")} tone={g.expired ? "muted" : "accent"} /></View>
    {offer?.starts ? <T variant="subtitle">{formatSgShort(offer.starts, language)}</T> : <T variant="subtitle">{t("groupOf", { n: g.size })}</T>}
    {offer?.place && <View style={[common.row, { gap: 10 }]}><PlaceThumb place={offer.place} size={48} />
      <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold} numberOfLines={1}>{offer.place.name}</T>
        <T variant="small" muted numberOfLines={1}>{[offer.place.branch, offer.place.hours].filter(Boolean).join(" · ")}</T></View></View>}
    <View style={[common.row, { gap: 8 }]}><FaceStack people={coming} size={28} /><SeatDots taken={0} size={Math.max(0, g.size - seats)} />
      <T variant="small" style={common.bold}>{t("tableOfTaken", { n: g.size, taken: seats })}</T></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      <StatusPill label={t("optPay", { value: offer?.pay ?? g.pay })} />
      {g.listed && <StatusPill label={t("keeps", { diets: dietSummary(g.diets) })} />}
    </View>
    {g.expired ? <T muted>{t("invitationExpired")}</T> : <>
      <Action label={t("accept")} run={() => answer(true)} />
      <Button label={t("suggestSlot")} icon="calendar-outline" variant="secondary" onPress={() => setSuggesting(true)} />
      <View style={common.spread}><T variant="small" muted>{g.expiresAt ? t("replyBy", { day: replyDay(g.expiresAt, language) }) : ""}</T><Button label={t("notThisTime")} variant="link" onPress={() => void answer(false).catch(error => setNotice({ text: error instanceof Error ? error.message : t("didNotSend"), error: true }))} /></View>
    </>}
    <Sheet visible={suggesting} onClose={() => setSuggesting(false)} title={t("suggestSlot")} footer={<Action label={t("sendSuggestion")} disabled={!slot} run={send} />}>
      <SlotPicker slots={suggestedSlots([], [], now)} value={slot} onChange={setSlot} />
    </Sheet>
  </Card>;
}
