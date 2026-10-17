import type { CookingTimer } from "../types/food";
import type { PlanReminder } from "../types/meet";
import { payLabels } from "../types/meet";
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
    owner, timerId: timer.id, endsAt: timer.endsAt, label: timer.label };
}
const reminderOffsets = [{ key: "day", ms: 86400000, title: "Food plan tomorrow" }, { key: "hour", ms: 3600000, title: "Food plan in 1 hour" }];
/** Reminders 1 day and 1 hour before each plan the user confirmed and opted into. */
export function planAlertsFor(owner: string, reminders: PlanReminder[], now = Date.now()): TimerAlert[] {
  return reminders.flatMap(g => {
    const at = parseSgDateTime(g.starts);
    return at === null ? [] : reminderOffsets.filter(o => at - o.ms > now).map(o => ({ id: timerAlertPrefix + owner + "/plan/" + g.groupId + "/" + o.key + "/" + at, owner, timerId: g.groupId,
      endsAt: at - o.ms, kind: "plan" as const, title: o.title, label: g.venue + " · " + formatSgDateTime(at) + " · " + payLabels[g.pay] }));
  });
}
export async function syncTimerAlerts(adapter: TimerAlertAdapter, owner: string, timers: CookingTimer[], enabled: boolean, plans: TimerAlert[] = []) {
  const allowed = canScheduleTimerAlerts(await adapter.permission());
  const alerts = allowed ? [...(enabled ? timers.map(t => alertFor(owner, t)).filter((t): t is TimerAlert => !!t) : []), ...plans] : [];
  const keep = new Set(alerts.map(t => t.id));
  const scheduled = await adapter.scheduled();
  for (const id of scheduled) if (id.startsWith(timerAlertPrefix) && !keep.has(id)) await adapter.cancel(id);
  for (const id of await adapter.presented()) if (id.startsWith(timerAlertPrefix) && !keep.has(id)) await adapter.dismiss(id);
  for (const alert of alerts) if (alert.endsAt > Date.now() && !scheduled.includes(alert.id)) await adapter.schedule(alert);
}
