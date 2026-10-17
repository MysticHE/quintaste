export type PhotoState = { uri?: string; failed: boolean };
type Transfer = {
  state: PhotoState; listeners: Set<(state: PhotoState) => void>; controller: AbortController;
  expiry?: ReturnType<typeof setTimeout>; timeout?: ReturnType<typeof setTimeout>;
};
const active = new Map<string, Transfer>();
let retryAt = 0;
function releaseBlob(blob: Blob) { (blob as Blob & { close?: () => void }).close?.(); }

function readPhoto(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { releaseBlob(blob); reject(new Error("Photo request cancelled.")); return; }
    const reader = new FileReader();
    let settled = false;
    const abort = () => { try { reader.abort(); } finally { finish(new Error("Photo request cancelled.")); } };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      reader.onload = reader.onerror = reader.onabort = null;
      releaseBlob(blob);
      if (error) reject(error);
      else if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Photo unavailable."));
    };
    reader.onload = () => finish();
    reader.onerror = () => finish(new Error("Photo unavailable."));
    reader.onabort = () => finish(new Error("Photo request cancelled."));
    signal.addEventListener("abort", abort, { once: true });
    try { reader.readAsDataURL(blob); }
    catch { finish(new Error("Photo unavailable.")); }
  });
}

function publish(transfer: Transfer, state: PhotoState) {
  transfer.state = state;
  for (const notify of transfer.listeners) notify(state);
}
async function download(url: string, expiresAt: number, transfer: Transfer) {
  try {
    const response = await fetch(url, { signal: transfer.controller.signal, cache: "no-store" });
    if (!response.ok) {
      if (response.status === 429 || response.status === 503) retryAt = Date.now() + 60000;
      throw new Error("Photo unavailable.");
    }
    const blob = await response.blob();
    if (!/^image\/(jpeg|png|webp|avif|gif)$/i.test(blob.type) || blob.size > 5 * 1024 * 1024 || !blob.size) {
      releaseBlob(blob); throw new Error("Photo unavailable.");
    }
    const uri = await readPhoto(blob, transfer.controller.signal);
    if (!transfer.controller.signal.aborted && Date.now() < expiresAt) publish(transfer, { uri, failed: false });
  } catch { publish(transfer, { failed: true }); }
  finally { clearTimeout(transfer.timeout); }
}

// Share a live display's bytes, then discard them when its last consumer leaves.
export function subscribePhoto(url: string, expiresAt: number, notify: (state: PhotoState) => void) {
  const now = Date.now(), lifetime = Number.isFinite(expiresAt) ? Math.min(300000, expiresAt - now) : 0;
  if (lifetime <= 0) { notify({ failed: true }); return () => {}; }
  const key = url + "|" + expiresAt;
  let transfer = active.get(key);
  if (!transfer) {
    if (now < retryAt) { notify({ failed: true }); return () => {}; }
    transfer = { state: { failed: false }, listeners: new Set(), controller: new AbortController() };
    active.set(key, transfer);
    const created = transfer;
    created.expiry = setTimeout(() => {
      created.controller.abort(); publish(created, { failed: true }); active.delete(key);
    }, lifetime);
    created.timeout = setTimeout(() => created.controller.abort(), 20000);
    void download(url, expiresAt, created);
  }
  const current = transfer;
  current.listeners.add(notify); notify(current.state);
  return () => {
    current.listeners.delete(notify);
    queueMicrotask(() => {
      if (current.listeners.size) return;
      current.controller.abort(); clearTimeout(current.expiry); clearTimeout(current.timeout);
      current.state = { failed: false };
      if (active.get(key) === current) active.delete(key);
    });
  };
}
export function rejectPhoto(url: string, expiresAt: number) {
  const transfer = active.get(url + "|" + expiresAt);
  if (transfer) { transfer.controller.abort(); publish(transfer, { failed: true }); }
}
