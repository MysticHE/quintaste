import type { Language } from "../config/preferences";
import en from "../i18n/en/explore";
import zh from "../i18n/zh/explore";

export type ExploreKey = Extract<keyof typeof en, string>;
/** Explore's message table for a language, for helpers that run outside React (and on the server, so no React imports here). */
export const exploreWords = (language: Language) => language === "zh" ? zh : en;
export const isExploreKey = (value: string): value is ExploreKey => Object.prototype.hasOwnProperty.call(en, value);
/** Shows a stored explore key in the reader's language; any other text (a server message) passes through unchanged. */
export function exploreText(language: Language, value: string) {
  if (!isExploreKey(value)) return value;
  const message = exploreWords(language)[value];
  return typeof message === "function" ? message({}) : message;
}
/** An app-written failure: its message stays English for logs, its key is what screens translate. */
export class ExploreError extends Error {
  constructor(readonly key: ExploreKey) { super(exploreText("en", key)); }
}
/** The explore key of an app-written failure, else the failure's own text, else the fallback key. */
export const problemText = (problem: unknown, fallback: ExploreKey) =>
  problem instanceof ExploreError ? problem.key : problem instanceof Error ? problem.message : fallback;

export type LocationIssue = "settings" | "permission" | "timeout" | "outside" | "unavailable";

export const locationMessages: Record<LocationIssue, ExploreKey> = {
  settings: "locTurnOn",
  permission: "locAllow",
  timeout: "locTimeout",
  outside: "locOutside",
  unavailable: "locUnavailable",
};
export function locationIssue(problem: unknown): LocationIssue {
  const value = problem && typeof problem === "object" ? problem as { code?: unknown; message?: unknown } : {};
  const code = typeof value.code === "number" ? value.code : undefined;
  const text = [value.code, value.message].filter(item => typeof item === "string").join(" ").toLowerCase();
  if (code === 1 || /permission|unauthorized|access.denied/.test(text)) return "permission";
  if (/unsatisfied|settings|services?.*(?:off|disabled|not enabled)/.test(text)) return "settings";
  if (code === 3 || /timeout|timed out|took too long/.test(text)) return "timeout";
  return "unavailable";
}
