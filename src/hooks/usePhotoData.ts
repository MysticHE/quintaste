import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../utils/api-url";
import { rejectPhoto, subscribePhoto, type PhotoState } from "../utils/photo-transfer";

export function usePhotoData(url: string | undefined, expiresAt: number, enabled = true) {
  const [data, setData] = useState<{ url: string; expiresAt: number; state: PhotoState } | null>(null);
  let resolved: string | undefined;
  try { if (url) resolved = apiUrl(url); }
  catch { /* A build without a live API shows the unavailable state. */ }
  useEffect(() => {
    if (!url || !resolved || !enabled) return;
    return subscribePhoto(resolved, expiresAt, state => setData({ url, expiresAt, state }));
  }, [url, resolved, expiresAt, enabled]);
  const fail = useCallback(() => {
    if (resolved) rejectPhoto(resolved, expiresAt);
    if (url) setData({ url, expiresAt, state: { failed: true } });
  }, [url, resolved, expiresAt]);
  const current = data?.url === url && data?.expiresAt === expiresAt ? data.state : undefined;
  return { uri: current?.uri, failed: !!url && !resolved || (current?.failed ?? false), fail };
}
