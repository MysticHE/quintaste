import { Platform, Share, View } from "react-native";
import { timerAlerts } from "../../services/timer-alerts";
import { canScheduleTimerAlerts } from "../../services/timer-alert-policy";
import { exportCalendarEvent } from "../../services/calendar-export";
import { confirm } from "../../services/social-api";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useMeet } from "../../hooks/useMeet";
import { reminderFor } from "../../hooks/useReminderSync";
import { payLabels } from "../../types/meet";
import type { ChatMessage, Group } from "../../types/community";
import { groupFull, isPast, planAt, planShareText, tableNeeds } from "../../utils/meet";
import { formatSgDateTime, formatSgText } from "../../utils/sg-datetime";
import { Action, ActionChip } from "./Shared";
import { ListGroup, ListItem, RowIcon, ThemedSwitch } from "../GroupedList";

/** System lines are never shown as a person speaking. */
export function SystemLine({ message }: { message: ChatMessage }) {
  const { theme } = usePreferences();
  return <View style={[common.row, { gap: 6, justifyContent: "center", paddingVertical: 2 }]} accessible accessibilityLabel={message.body + ", " + formatSgDateTime(Date.parse(message.createdAt))}>
    <Icon name="ellipse" size={6} color={theme.mutedForeground} /><T variant="small" muted style={{ flexShrink: 1, textAlign: "center" }}>{message.body}</T>
  </View>;
}
export async function addToCalendar(g: Group) {
  const at = planAt(g); if (at === null) throw new Error("Choose a date and time first.");
  await exportCalendarEvent({ uid: g.id, title: "Food plan · group of " + g.size, start: at, minutes: 120, location: g.venue, description: payLabels[g.pay] + ". From QuinTaste." });
}
/** Device reminders 1 day and 1 hour before go through the shared timer alert coordinator; the web has no device alerts. */
function ReminderRow({ group: g }: { group: Group }) {
  const { network, commit } = useMeet(), { setNotice } = usePreferences(), on = network.reminders.some(r => r.groupId === g.id);
  const toggle = async () => {
    if (on) { await commit({ type: "reminder", groupId: g.id, reminder: null }); return; }
    const status = await timerAlerts.permission(true);
    if (!canScheduleTimerAlerts(status)) { setNotice({ text: "Allow notifications in device settings to get plan reminders.", error: true }); return; }
    await commit({ type: "reminder", groupId: g.id, reminder: reminderFor(g) });
    if (status === "timing-unverified") setNotice({ text: "Reminders are on. Timing on this Android version may be approximate." });
  };
  return <ListItem title="Remind Me" subtitle="1 day and 1 hour before" leading={<RowIcon name="notifications-outline" />}
    trailing={<ThemedSwitch label="Remind me 1 day and 1 hour before" value={on} onChange={() => void toggle().catch(() => setNotice({ text: "Reminders could not be changed. Try again.", error: true }))} />} />;
}
/** The agreed plan in one place: where, when, who pays, shared needs and who has confirmed. */
/** Without `onEdit` (an open table you do not host) the plan has no Edit action. */
export function PlanSummary({ group: g, onEdit, onChange, now }: { group: Group; onEdit?: () => void; onChange: () => void; now: number }) {
  const { setNotice } = usePreferences(), needs = tableNeeds(g), past = isPast(g, now);
  const mine = !!g.members.find(m => m.isMe)?.confirmed, confirmed = g.members.filter(m => m.confirmed).map(m => m.isMe ? "You" : m.name);
  const share = async () => { try { await Share.share({ message: planShareText(g) }); } catch { setNotice({ text: "Sharing is unavailable here. Copy the place and time instead.", error: true }); } };
  return <>
    <ListGroup title="Plan">
      <ListItem title={g.venue} leading={<RowIcon name="location-outline" />} wrap />
      <ListItem title={formatSgText(g.starts) || "Time to agree"} leading={<RowIcon name="calendar-outline" />} />
      <ListItem title={payLabels[g.pay]} leading={<RowIcon name="wallet-outline" />} />
      <ListItem title={needs.diet} subtitle={needs.detail || undefined} leading={<RowIcon name="leaf-outline" />} wrap />
      {!!g.food && <ListItem title={g.food} leading={<RowIcon name="restaurant-outline" />} wrap />}
      <ListItem title={confirmed.length + " of " + g.size + " confirmed"} subtitle={confirmed.join(", ") || undefined}
        leading={<RowIcon name="checkmark-done-outline" tone={confirmed.length === g.size ? "accent" : "muted"} />} />
      {!past && mine && Platform.OS !== "web" && <ReminderRow group={g} />}
    </ListGroup>
    {!past && !mine && <Action label={groupFull(g) ? "I'm In" : "Waiting For Everyone To Join"} disabled={!groupFull(g)} run={async () => { await confirm(g.id); onChange(); }} />}
    {!past && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {onEdit && <ActionChip label="Edit" icon="create-outline" run={async () => onEdit()} />}
      <ActionChip label="Share" icon="share-outline" run={share} />
      <ActionChip label="Calendar" icon="calendar-outline" run={() => addToCalendar(g)} />
    </View>}
  </>;
}
