import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Button, Field, T, common } from "../ui";
import { Chip } from "../food/Controls";
import { ChoiceGroup } from "./ProfileFields";
import { DateTile, ListGroup, ListItem, RowIcon, StatusPill, ThemedSwitch, type Tone } from "../GroupedList";
import { timerAlerts } from "../../services/timer-alerts";
import { canScheduleTimerAlerts } from "../../services/timer-alert-policy";
import { acceptDinner, declineDinner, lateDinner, lateMinutes, reportDinner, suggestDinner } from "../../services/social-api";
import { invalidate } from "../../hooks/useRemote";
import { useMeet } from "../../hooks/useMeet";
import { reminderFor } from "../../utils/dinner-reminders";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { formatSgText, parseSgDateTime, sgDateTile } from "../../utils/sg-datetime";
import type { Dinner, Met, SocialPlace } from "../../types/community";
import type socialMessages from "../../i18n/en/social";
import { useSocialError } from "./SocialState";
import { SgDateTimeField } from "./SgDateTimeField";
import { Sheet } from "../Sheet";
import { openSocial } from "./Shared";
import { PlacePicker } from "./PlacePicker";

/** Who pays, worded for the viewer: "I'll pay the bill" reads "You pay the bill" or "Mei pays the bill". */
export function usePayText() {
  const t = useT("social");
  return (d: Pick<Dinner, "pay" | "hosting" | "withName">) => d.pay === "split" ? t("paySplit") : d.pay === "own" ? t("payOwn")
    : d.hosting ? t("payHostYou") : t("payHostThem", { name: d.withName });
}
/** Asks once for notifications at a moment that explains itself (sending or accepting an invite); phones only, never blocks. */
export function askForReminders() {
  if (Platform.OS !== "web") void timerAlerts.permission(true).catch(() => undefined);
}
/** A confirmed dinner on the day: from three hours before it starts until an hour after (the server's Running late window). */
export function isDayOf(d: Pick<Dinner, "status" | "starts">, now: number) {
  const at = parseSgDateTime(d.starts);
  return d.status === "accepted" && at !== null && now >= at - 3 * 3600000 && now <= at + 3600000;
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
    <Button label={t("accept")} icon="checkmark" loading={busy === "accept"} disabled={!!busy}
      onPress={() => void run("accept", async () => { await acceptDinner(d.id); askForReminders(); }, "dinnerOn")} />
    <View style={[common.row, { gap: 8 }]}>
      <View style={{ flex: 1.7 }}><Button label={t("suggestTime")} variant="secondary" disabled={!!busy} onPress={() => setSuggesting(true)} /></View>
      <View style={{ flex: 1 }}><Button label={t("decline")} variant="secondary" loading={busy === "decline"} disabled={!!busy} onPress={() => void run("decline", () => declineDinner(d.id))} /></View>
    </View>
    <SuggestSheet dinner={d} visible={suggesting} onClose={() => setSuggesting(false)} onSent={onDone} />
  </View>;
}
/** A new time, a new place or both for the invite (whatever is left alone stays); the other person answers next. */
export function SuggestSheet({ dinner: d, visible, onClose, onSent }: { dinner: Dinner; visible: boolean; onClose: () => void; onSent?: () => void }) {
  const t = useT("social"), { theme, setNotice } = usePreferences(), problem = useSocialError(), language = useLanguage();
  const [starts, setStarts] = useState(""), [place, setPlace] = useState<SocialPlace | null>(null), [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const changedPlace = place && place.id !== d.placeId ? place : null;
  const clear = () => { setStarts(""); setPlace(null); setError(""); };
  const close = () => { if (busy) return; clear(); onClose(); };
  const send = async () => {
    setBusy(true); setError("");
    try {
      await suggestDinner(d.id, { ...(starts ? { starts } : {}), ...(changedPlace ? { placeId: changedPlace.id } : {}) });
      setNotice({ text: t("suggestionSent", { name: d.withName }) }); invalidate("/api/social"); clear(); onClose(); onSent?.();
    } catch (failure) { setError(problem(failure, d.withName)); }
    finally { setBusy(false); }
  };
  const placeName = changedPlace?.name ?? d.placeName;
  return <Sheet visible={visible} onClose={close} title={t("suggestTitle")}
    footer={<Button label={t("sendSuggestion")} icon="send-outline" loading={busy} disabled={!starts && !changedPlace} onPress={() => void send()} />}>
    <SgDateTimeField label={t("newTime")} value={starts} onChange={setStarts} />
    {!starts && <T variant="small" muted>{t("keepsTime", { time: formatSgText(d.starts, language) })}</T>}
    <ListGroup title={t("newPlace")}>
      <ListItem title={placeName} wrap leading={<RowIcon name="location-outline" />} label={t("changePlaceA11y", { place: placeName })} onPress={() => setPicking(true)}
        subtitle={changedPlace ? [changedPlace.branch, changedPlace.hours].filter(Boolean).join(" · ") || changedPlace.address : t("keepsPlace")}
        trailing={<T variant="button" color={theme.accent}>{t("change")}</T>} />
    </ListGroup>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <PlacePicker visible={picking} onClose={() => setPicking(false)} onPick={setPlace} selectedId={changedPlace?.id ?? d.placeId}
      withPerson={{ id: d.withId, name: d.withName }} />
  </Sheet>;
}
/** Running late on the day: one tap tells them in your chat how late you'll be. `compact` fits the chat's pinned bar. */
export function LateChips({ dinner: d, compact = false }: { dinner: Dinner; compact?: boolean }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), [busy, setBusy] = useState<number | null>(null);
  const send = async (minutes: typeof lateMinutes[number]) => {
    setBusy(minutes);
    try { await lateDinner(d.id, minutes); setNotice({ text: t("lateSent", { name: d.withName }) }); invalidate("/api/social"); }
    catch (failure) { setNotice({ text: problem(failure, d.withName), error: true }); }
    finally { setBusy(null); }
  };
  return <View style={{ gap: 8 }}>
    <T variant="small" style={common.bold}>{t("runningLate")}</T>
    <View style={[common.row, { gap: 8, flexWrap: "wrap" }]}>
      {lateMinutes.map(minutes => <Chip key={minutes} label={t("lateMinutes", { n: minutes })} a11y={t("lateA11y", { n: minutes, name: d.withName })} icon={compact ? undefined : "time-outline"}
        compact={compact} disabled={busy !== null} onPress={() => void send(minutes)} />)}
    </View>
  </View>;
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
/**
 * Device reminders for a confirmed dinner (1 day and 1 hour before, then a prompt to say how it went), through the shared timer
 * coordinator. They are on for every dinner (DinnerReminderSync); the switch shows on only while the phone allows notifications, and
 * turning it off is remembered for this dinner. The web has no device alerts.
 */
export function DinnerReminder({ dinner: d }: { dinner: Dinner }) {
  const { network, commit } = useMeet(), { setNotice } = usePreferences(), t = useT("social"), [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let live = true;
    if (Platform.OS !== "web") void timerAlerts.permission().then(status => { if (live) setAllowed(canScheduleTimerAlerts(status)); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  const on = allowed && network.reminders.some(r => r.groupId === d.id);
  if (Platform.OS === "web" || !reminderFor(d)) return null;
  const toggle = async () => {
    if (on) { await commit({ type: "reminder", groupId: d.id, reminder: null }); return; }
    const status = await timerAlerts.permission(true);
    if (!canScheduleTimerAlerts(status)) { setNotice({ text: t("allowNotifications"), error: true }); return; }
    setAllowed(true);
    await commit({ type: "reminder", groupId: d.id, reminder: reminderFor(d) });
    if (status === "timing-unverified") setNotice({ text: t("remindersApprox") });
  };
  return <ListItem title={t("remindMe")} subtitle={t("remindWhen")} wrap leading={<RowIcon name="notifications-outline" />}
    trailing={<ThemedSwitch label={t("remindSwitch")} value={on} onChange={() => void toggle().catch(() => setNotice({ text: t("remindersFailed"), error: true }))} />} />;
}
