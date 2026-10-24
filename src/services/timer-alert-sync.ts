import type { Language } from "../config/preferences";
import type { CookingTimer } from "../types/food";
import type { PlanReminder } from "../types/meet";
import { translate } from "../i18n";
import { parseSgDateTime, formatSgDateTime } from "../utils/sg-datetime";
import type { TimerAlert, TimerAlertAdapter } from "./timer-alerts";
import { canScheduleTimerAlerts } from "./timer-alert-policy";
export const timerAlertPrefix = "quintaste-timer/";
export async function clearOtherTimerOwners(adapter: TimerAlertAdapter, owner: string) {
  const ownPrefix = timerAlertPrefix + owner + "/";
  for (const id of await adapter.scheduled()) if (id.startsWith(timerAlertPrefix) && !id.startsWith(ownPrefix)) await adapter.cancel(id);
  for (const id of await adapter.presented()) if (id.startsWith(timerAlertPrefix) && !id.startsWith(ownPrefix)) await adapter.dismiss(id);
}
export function alertFor(owner: string, timer: CookingTimer): TimerAlert | null {
  return timer.endsAt === null ? null : { id: timerAlertPrefix + owner + "/" + timer.id + "/" + timer.endsAt,
    owner, timerId: timer.id, endsAt: timer.endsAt, text: language => ({ title: translate(language, "cook", "timerAlertTitle"), body: timer.label }) };
}
/** Reminder times before an event: a key for the alert id, how long before, and the alert title. */
export type ReminderOffset = { key: string; ms: number; title: (language: Language) => string };
/** Alerts for upcoming events (Social plans, Market collections), one per offset that is still in the future. */
export function reminderAlerts(owner: string, kind: "plan" | "order", events: { id: string; starts: string; label: (at: number, language: Language) => string }[],
  offsets: ReminderOffset[], now = Date.now()): TimerAlert[] {
  return events.flatMap(event => {
    const at = parseSgDateTime(event.starts);
    return at === null ? [] : offsets.filter(o => at - o.ms > now).map(o => ({ id: timerAlertPrefix + owner + "/" + kind + "/" + event.id + "/" + o.key + "/" + at, owner,
      timerId: event.id, endsAt: at - o.ms, kind, text: (language: Language) => ({ title: o.title(language), body: event.label(at, language) }) }));
  });
}
const planOffsets: ReminderOffset[] = [{ key: "day", ms: 86400000, title: language => translate(language, "social", "planReminderDay") },
  { key: "hour", ms: 3600000, title: language => translate(language, "social", "planReminderHour") }];
/** Reminders 1 day and 1 hour before each plan the user confirmed and opted into. */
export const planAlertsFor = (owner: string, reminders: PlanReminder[], now = Date.now()) => reminderAlerts(owner, "plan",
  reminders.map(g => ({ id: g.groupId, starts: g.starts,
    label: (at: number, language: Language) => g.venue + " · " + formatSgDateTime(at, language) + " · " + translate(language, "social", "optPay", { value: g.pay }) })), planOffsets, now);
export async function syncTimerAlerts(adapter: TimerAlertAdapter, owner: string, timers: CookingTimer[], enabled: boolean, plans: TimerAlert[] = []) {
  const allowed = canScheduleTimerAlerts(await adapter.permission());
  const alerts = allowed ? [...(enabled ? timers.map(t => alertFor(owner, t)).filter((t): t is TimerAlert => !!t) : []), ...plans] : [];
  const keep = new Set(alerts.map(t => t.id));
  const scheduled = await adapter.scheduled();
  for (const id of scheduled) if (id.startsWith(timerAlertPrefix) && !keep.has(id)) await adapter.cancel(id);
  for (const id of await adapter.presented()) if (id.startsWith(timerAlertPrefix) && !keep.has(id)) await adapter.dismiss(id);
  for (const alert of alerts) if (alert.endsAt > Date.now() && !scheduled.includes(alert.id)) await adapter.schedule(alert);
}
