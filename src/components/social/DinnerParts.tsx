import { useState } from "react";
import { Platform, View } from "react-native";
import { Button, Field, T, common } from "../ui";
import { Chip } from "../food/Controls";
import { ChoiceGroup } from "./ProfileFields";
import { DateTile, ListItem, RowIcon, StatusPill, ThemedSwitch, type Tone } from "../GroupedList";
import { timerAlerts } from "../../services/timer-alerts";
import { canScheduleTimerAlerts } from "../../services/timer-alert-policy";
import { acceptDinner, declineDinner, reportDinner, suggestDinner } from "../../services/social-api";
import { invalidate } from "../../hooks/useRemote";
import { useMeet } from "../../hooks/useMeet";
import { reminderFor } from "../../hooks/useReminderSync";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { formatSgText, sgDateTile } from "../../utils/sg-datetime";
import type { Dinner, Met } from "../../types/community";
import type socialMessages from "../../i18n/en/social";
import { useSocialError } from "./SocialState";
import { SgDateTimeField } from "./SgDateTimeField";
import { Sheet } from "../Sheet";
import { openSocial } from "./Shared";

/** Who pays, worded for the viewer: "I'll pay the bill" reads "You pay the bill" or "Mei pays the bill". */
export function usePayText() {
  const t = useT("social");
  return (d: Pick<Dinner, "pay" | "hosting" | "withName">) => d.pay === "split" ? t("paySplit") : d.pay === "own" ? t("payOwn")
    : d.hosting ? t("payHostYou") : t("payHostThem", { name: d.withName });
}
/** Where a dinner stands for the viewer, as a short pill. */
export function useDinnerStatus() {
  const t = useT("social");
  return (d: Dinner): [string, Tone] => {
    if (d.status === "invited") return d.yourTurn ? [t("statusAnswer"), "accent"] : [t("waitingFor", { name: d.withName }), "muted"];
    if (d.status === "accepted") return !d.past ? [t("statusConfirmed"), "success"] : d.reportOpen && !d.reported ? [t("statusTellUs"), "warning"] : [t("past"), "muted"];
    return [t(({ declined: "statusDeclined", cancelled: "statusCancelled", expired: "statusExpired" } as const)[d.status]), "muted"];
  };
}
/** One dinner as a row: date, place, with whom and its status. */
export function DinnerRow({ dinner: d }: { dinner: Dinner }) {
  const t = useT("social"), language = useLanguage(), tile = sgDateTile(d.starts, language), [status, tone] = useDinnerStatus()(d);
  return <ListItem title={d.placeName} subtitle={t("withName", { name: d.withName }) + " · " + (tile?.time ?? "")} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
    trailing={<StatusPill label={status} tone={tone} />} label={[d.placeName, t("withName", { name: d.withName }), formatSgText(d.starts, language), status].join(", ")}
    onPress={() => openSocial("/dinner/" + d.id)} />;
}
/** Accept, Suggest Another Time or Decline, for the person the invite waits on. */
export function AnswerButtons({ dinner: d, onDone }: { dinner: Dinner; onDone?: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), [busy, setBusy] = useState<string | null>(null), [suggesting, setSuggesting] = useState(false);
  const run = async (key: string, work: () => Promise<unknown>, notice?: keyof typeof socialMessages) => {
    setBusy(key);
    try { await work(); if (notice) setNotice({ text: t(notice, { name: d.withName }) as string }); invalidate("/api/social"); onDone?.(); }
    catch (failure) { setNotice({ text: problem(failure, d.withName), error: true }); }
    finally { setBusy(null); }
  };
  return <View style={{ gap: 8 }}>
    <Button label={t("accept")} icon="checkmark" loading={busy === "accept"} disabled={!!busy} onPress={() => void run("accept", () => acceptDinner(d.id), "dinnerOn")} />
    <View style={[common.row, { gap: 8 }]}>
      <View style={{ flex: 1.7 }}><Button label={t("suggestTime")} variant="secondary" disabled={!!busy} onPress={() => setSuggesting(true)} /></View>
      <View style={{ flex: 1 }}><Button label={t("decline")} variant="secondary" loading={busy === "decline"} disabled={!!busy} onPress={() => void run("decline", () => declineDinner(d.id))} /></View>
    </View>
    <SuggestSheet dinner={d} visible={suggesting} onClose={() => setSuggesting(false)} onSent={onDone} />
  </View>;
}
/** A new time for the invite; the other person answers next. */
export function SuggestSheet({ dinner: d, visible, onClose, onSent }: { dinner: Dinner; visible: boolean; onClose: () => void; onSent?: () => void }) {
  const t = useT("social"), { theme, setNotice } = usePreferences(), problem = useSocialError(), [starts, setStarts] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try { await suggestDinner(d.id, starts); setNotice({ text: t("suggestionSent", { name: d.withName }) }); invalidate("/api/social"); onClose(); onSent?.(); }
    catch (failure) { setError(problem(failure, d.withName)); }
    finally { setBusy(false); }
  };
  return <Sheet visible={visible} onClose={() => { if (!busy) onClose(); }} title={t("suggestTitle")}
    footer={<Button label={t("sendSuggestion")} icon="send-outline" loading={busy} disabled={!starts} onPress={() => void send()} />}>
    <SgDateTimeField label={t("dateAndTime")} value={starts} onChange={setStarts} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </Sheet>;
}
/** After the dinner: did you meet, would you eat together again (private, told only when both say yes), and a note only they read. */
export function AfterDinnerSheet({ dinner: d, visible, onClose }: { dinner: Dinner; visible: boolean; onClose: () => void }) {
  const t = useT("social"), { theme, setNotice } = usePreferences(), problem = useSocialError();
  const [met, setMet] = useState<Met | null>(null), [again, setAgain] = useState<boolean | null>(null), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    if (!met) return;
    setBusy(true); setError("");
    try { await reportDinner(d.id, { met, eatAgain: met === "yes" ? again : null, note: met === "yes" ? note : "" }); setNotice({ text: t("thanksNotice") }); invalidate("/api/social"); onClose(); }
    catch (failure) { setError(problem(failure, d.withName)); }
    finally { setBusy(false); }
  };
  const options: [Met, keyof typeof socialMessages][] = [["yes", "metYes"], ["no_show", "metNoShow"], ["didnt_go", "metDidntGo"]];
  return <Sheet visible={visible} onClose={() => { if (!busy) onClose(); }} title={t("afterTitle", { name: d.withName })}
    footer={<Button label={t("send")} icon="send-outline" loading={busy} disabled={!met} onPress={() => void send()} />}>
    <ChoiceGroup label={t("didYouMeet")}>{options.map(([id, key]) => <Chip key={id} label={t(key) as string} role="radio" selected={met === id} onPress={() => setMet(id)} />)}</ChoiceGroup>
    {met === "yes" && <>
      <View style={{ gap: 6 }}>
        <ChoiceGroup label={t("eatAgainQ", { name: d.withName })}>{([true, false] as const).map(value => <Chip key={String(value)} label={t(value ? "yes" : "no")} role="radio"
          icon={value ? "heart-outline" : "close"} selected={again === value} onPress={() => setAgain(value)} />)}</ChoiceGroup>
        <T variant="small" muted>{t("eatAgainNote")}</T>
      </View>
      <Field label={t("noteTo", { name: d.withName })} value={note} onChangeText={setNote} placeholder={t("noteHint", { name: d.withName })} maxLength={300} multiline />
    </>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </Sheet>;
}
/** Device reminders 1 day and 1 hour before an accepted dinner, through the shared timer coordinator; the web has no device alerts. */
export function DinnerReminder({ dinner: d }: { dinner: Dinner }) {
  const { network, commit } = useMeet(), { setNotice } = usePreferences(), t = useT("social"), on = network.reminders.some(r => r.groupId === d.id);
  if (Platform.OS === "web" || !reminderFor(d)) return null;
  const toggle = async () => {
    if (on) { await commit({ type: "reminder", groupId: d.id, reminder: null }); return; }
    const status = await timerAlerts.permission(true);
    if (!canScheduleTimerAlerts(status)) { setNotice({ text: t("allowNotifications"), error: true }); return; }
    await commit({ type: "reminder", groupId: d.id, reminder: reminderFor(d) });
    if (status === "timing-unverified") setNotice({ text: t("remindersApprox") });
  };
  return <ListItem title={t("remindMe")} subtitle={t("remindWhen")} leading={<RowIcon name="notifications-outline" />}
    trailing={<ThemedSwitch label={t("remindSwitch")} value={on} onChange={() => void toggle().catch(() => setNotice({ text: t("remindersFailed"), error: true }))} />} />;
}
