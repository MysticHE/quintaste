export type AlertPermission = "granted" | "timing-unverified" | "denied" | "undetermined" | "unsupported";
/** Cooking timers and confirmed-plan reminders share one alert shape and one coordinator queue. */
export type TimerAlert = { id: string; owner: string; timerId: string; endsAt: number; label: string; kind?: "timer" | "plan"; title?: string };
export type TimerAlertAdapter = {
  permission: (request?: boolean) => Promise<AlertPermission>;
  scheduled: () => Promise<string[]>;
  presented: () => Promise<string[]>;
  cancel: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  schedule: (alert: TimerAlert) => Promise<void>;
};
export const timerAlerts: TimerAlertAdapter = {
  permission: async () => "unsupported", scheduled: async () => [], presented: async () => [],
  cancel: async () => {}, dismiss: async () => {}, schedule: async () => {},
};
