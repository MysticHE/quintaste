/**
 * The screen the member is looking at, so a phone alert about that very screen (the chat that is open, the order on screen)
 * arrives quietly while the app is open: the screen already shows it. Set by usePushAlerts; read by the notification handler
 * in timer-alerts.native.ts.
 */
let visible: { path: string; params: Record<string, string> } = { path: "", params: {} };

export function setVisibleScreen(path: string, params: Record<string, string | string[] | undefined>) {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") flat[key] = value;
  visible = { path, params: flat };
}

/** Whether `url` (an alert's app path, with an optional query) is the screen on show now. */
export function alertOnScreen(url: unknown) {
  if (typeof url !== "string" || !url.startsWith("/") || !visible.path) return false;
  const [path, query = ""] = url.split("?");
  if (path !== visible.path) return false;
  return [...new URLSearchParams(query)].every(([key, value]) => visible.params[key] === value);
}
