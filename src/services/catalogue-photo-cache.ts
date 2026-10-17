// Public, approved assets only; separate from temporary Google photo transfers.
type State = { uri?: string; failed: boolean };
type Entry = { state: State; until: number; listeners: Set<(state: State) => void>; controller?: AbortController };
const entries = new Map<string, Entry>();
const maxEntries = 12, maxChars = 8 * 1024 * 1024;
function trim(reserve = 0) {
  let size = [...entries.values()].reduce((n, entry) => n + (entry.state.uri?.length || 0), 0);
  for (const [key, entry] of entries) {
    if (entries.size <= maxEntries - reserve && size <= maxChars - reserve * 700000) break;
    if (entry.listeners.size || entry.controller) continue;
    size -= entry.state.uri?.length || 0; entries.delete(key);
  }
}
function publish(entry: Entry, state: State) {
  entry.state = state;
  for (const notify of entry.listeners) notify(state);
}
async function download(url: string, entry: Entry, controller: AbortController) {
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
    if (!response.ok) throw new Error("Unavailable");
    const blob = await response.blob();
    if (controller.signal.aborted || blob.type !== "image/jpeg" || !blob.size || blob.size > 512 * 1024) {
      (blob as Blob & { close?: () => void }).close?.(); throw new Error("Invalid image");
    }
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      controller.signal.addEventListener("abort", abort, { once: true });
      reader.onloadend = () => {
        controller.signal.removeEventListener("abort", abort);
        (blob as Blob & { close?: () => void }).close?.();
        if (controller.signal.aborted || typeof reader.result !== "string") reject(new Error("Cancelled"));
        else resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
    if (!controller.signal.aborted) { entry.until = Date.now() + 86400000; publish(entry, { uri, failed: false }); }
  } catch { entry.until = Date.now() + 60000; publish(entry, { failed: true }); }
  finally { clearTimeout(timeout); entry.controller = undefined; trim(); }
}
export function subscribeCataloguePhoto(url: string, offline: boolean, notify: (state: State) => void) {
  let entry = entries.get(url);
  if (entry && !entry.controller && entry.until <= Date.now()) { entries.delete(url); entry = undefined; }
  if (!entry) {
    trim(1);
    // Bound both in-flight requests and resident bytes, including mounted cards.
    const size = [...entries.values()].reduce((n, item) => n + (item.state.uri?.length || 0), 0);
    if (offline || entries.size >= maxEntries || size > maxChars - 700000) { notify({ failed: true }); return () => {}; }
    entry = { state: { failed: false }, until: 0, listeners: new Set(), controller: new AbortController() };
    entries.set(url, entry); void download(url, entry, entry.controller!);
  } else { entries.delete(url); entries.set(url, entry); }
  const current = entry; current.listeners.add(notify); notify(current.state);
  return () => {
    current.listeners.delete(notify);
    queueMicrotask(() => {
      if (!current.listeners.size && current.controller) { current.controller.abort(); entries.delete(url); }
      trim();
    });
  };
}
