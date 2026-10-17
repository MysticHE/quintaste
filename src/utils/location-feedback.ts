export type LocationIssue = "settings" | "permission" | "timeout" | "outside" | "unavailable";

export const locationMessages: Record<LocationIssue, string> = {
  settings: "Turn on Location",
  permission: "Allow location access",
  timeout: "Location took too long",
  outside: "Choose a Singapore location",
  unavailable: "Location unavailable",
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
