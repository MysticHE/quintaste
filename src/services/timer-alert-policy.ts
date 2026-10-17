import type { AlertPermission } from "./timer-alerts";

export function canScheduleTimerAlerts(permission: AlertPermission) {
  return permission === "granted" || permission === "timing-unverified";
}
