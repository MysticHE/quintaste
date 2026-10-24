import type { Language } from "../config/preferences";

export type AlertPermission = "granted" | "timing-unverified" | "denied" | "undetermined" | "unsupported";
/** An alert's title and body, worded in the language read when it is scheduled. */
export type AlertText = (language: Language) => { title: string; body: string };
/** Cooking timers and confirmed-plan reminders share one alert shape and one coordinator queue. */
export type TimerAlert = { id: string; owner: string; timerId: string; endsAt: number; text: AlertText; kind?: "timer" | "plan" | "order" };
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
