import { Platform, Share, View } from "react-native";
import { timerAlerts } from "../../services/timer-alerts";
import { canScheduleTimerAlerts } from "../../services/timer-alert-policy";
import { exportCalendarEvent } from "../../services/calendar-export";
import { confirm } from "../../services/social-api";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { translate, useLanguage, useT, type Language } from "../../i18n";
import { useMeet } from "../../hooks/useMeet";
import { reminderFor } from "../../hooks/useReminderSync";
import type { ChatMessage, Group } from "../../types/community";
import { groupFull, isPast, planAt, planShareText, tableNeeds } from "../../utils/meet";
import { formatSgDateTime, formatSgText } from "../../utils/sg-datetime";
import { Action, ActionChip } from "./Shared";
import { ListGroup, ListItem, RowIcon, ThemedSwitch } from "../GroupedList";

/** System lines are never shown as a person speaking. */
export function SystemLine({ message }: { message: ChatMessage }) {
  const { theme } = usePreferences(), language = useLanguage();
  return <View style={[common.row, { gap: 6, justifyContent: "center", paddingVertical: 2 }]} accessible accessibilityLabel={message.body + ", " + formatSgDateTime(Date.parse(message.createdAt), language)}>
    <Icon name="ellipse" size={6} color={theme.mutedForeground} /><T variant="small" muted style={{ flexShrink: 1, textAlign: "center" }}>{message.body}</T>
  </View>;
}
export async function addToCalendar(g: Group, language: Language = "en") {
  const say = (key: Parameters<typeof translate<"social">>[2], vars?: Record<string, string | number>) => translate(language, "social", key, vars);
  const at = planAt(g); if (at === null) throw new Error(say("dateFirst"));
  await exportCalendarEvent({ uid: g.id, title: say("calendarTitle", { n: g.size }), start: at, minutes: 120, location: g.venue,
    description: say("optPay", { value: g.pay }) + (language === "zh" ? "。" : ". ") + say("fromQuinTaste") });
}
/** Device reminders 1 day and 1 hour before go through the shared timer alert coordinator; the web has no device alerts. */
function ReminderRow({ group: g }: { group: Group }) {
  const { network, commit } = useMeet(), { setNotice } = usePreferences(), t = useT("social"), on = network.reminders.some(r => r.groupId === g.id);
  const toggle = async () => {
    if (on) { await commit({ type: "reminder", groupId: g.id, reminder: null }); return; }
    const status = await timerAlerts.permission(true);
    if (!canScheduleTimerAlerts(status)) { setNotice({ text: t("allowNotifications"), error: true }); return; }
    await commit({ type: "reminder", groupId: g.id, reminder: reminderFor(g) });
    if (status === "timing-unverified") setNotice({ text: t("remindersApprox") });
  };
  return <ListItem title={t("remindMe")} subtitle={t("remindWhen")} leading={<RowIcon name="notifications-outline" />}
    trailing={<ThemedSwitch label={t("remindSwitch")} value={on} onChange={() => void toggle().catch(() => setNotice({ text: t("remindersFailed"), error: true }))} />} />;
}
/** The agreed plan in one place: where, when, who pays, shared needs and who has confirmed. */
/** Without `onEdit` (an open table you do not host) the plan has no Edit action. */
export function PlanSummary({ group: g, onEdit, onChange, now }: { group: Group; onEdit?: () => void; onChange: () => void; now: number }) {
  const { setNotice } = usePreferences(), t = useT("social"), tc = useT("common"), language = useLanguage(), needs = tableNeeds(g, language), past = isPast(g, now);
  const mine = !!g.members.find(m => m.isMe)?.confirmed, confirmed = g.members.filter(m => m.confirmed).map(m => m.isMe ? t("you") : m.name);
  const share = async () => { try { await Share.share({ message: planShareText(g, language) }); } catch { setNotice({ text: t("shareUnavailable"), error: true }); } };
  return <>
    <ListGroup title={t("plan")}>
      <ListItem title={g.venue} leading={<RowIcon name="location-outline" />} wrap />
      <ListItem title={formatSgText(g.starts, language) || t("timeToAgree")} leading={<RowIcon name="calendar-outline" />} />
      <ListItem title={t("optPay", { value: g.pay })} leading={<RowIcon name="wallet-outline" />} />
      <ListItem title={needs.diet} subtitle={needs.detail || undefined} leading={<RowIcon name="leaf-outline" />} wrap />
      {!!g.food && <ListItem title={g.food} leading={<RowIcon name="restaurant-outline" />} wrap />}
      <ListItem title={t("confirmedCount", { n: confirmed.length, size: g.size })} subtitle={confirmed.join(t("listSep")) || undefined}
        leading={<RowIcon name="checkmark-done-outline" tone={confirmed.length === g.size ? "accent" : "muted"} />} />
      {!past && mine && Platform.OS !== "web" && <ReminderRow group={g} />}
    </ListGroup>
    {!past && !mine && <Action label={t(groupFull(g) ? "imIn" : "waitingAll")} disabled={!groupFull(g)} run={async () => { await confirm(g.id); onChange(); }} />}
    {!past && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {onEdit && <ActionChip label={tc("edit")} icon="create-outline" run={async () => onEdit()} />}
      <ActionChip label={tc("share")} icon="share-outline" run={share} />
      <ActionChip label={t("calendar")} icon="calendar-outline" run={() => addToCalendar(g, language)} />
    </View>}
  </>;
}
