const windows = new Map<string, { started: number; count: number }>();
export function allowProviderRequest(bucket: "details" | "photos") {
  const now = Date.now(), limit = bucket === "details" ? 20 : 60;
  const current = windows.get(bucket);
  if (!current || now - current.started >= 60000) { windows.set(bucket, { started: now, count: 1 }); return true; }
  if (current.count >= limit) return false;
  current.count += 1; return true;
}
