import { useEffect, useState } from "react";
import { avatarRequest } from "../utils/avatar-api";
import { readAvatar } from "../utils/avatar-schema";
import type { Avatar } from "../types/avatar";
import { useT } from "../i18n";

/**
 * A breed's Adult and Mini forms from the member's avatar library (saved encrypted by the server when the breed
 * finished). Loads only when the ids change; `error` explains a failed load and `retry` tries again.
 */
export function useLotusForms(adultId: string | null | undefined, miniId: string | null | undefined) {
  const [forms, setForms] = useState<{ key: string; adult: Avatar | null; mini: Avatar | null } | null>(null);
  const [error, setError] = useState<"" | "lotusFormsUnreadable" | "lotusFormsFailed">(""), [attempt, setAttempt] = useState(0), t = useT("game");
  const key = adultId && miniId ? adultId + ":" + miniId : "";
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const load = (id: string) => avatarRequest<unknown>("profile", "library/" + encodeURIComponent(id), { signal: controller.signal }).then(readAvatar);
    void Promise.all([load(adultId!), load(miniId!)]).then(([adult, mini]) => {
      if (controller.signal.aborted) return;
      setForms({ key, adult, mini }); setError(adult && mini ? "" : "lotusFormsUnreadable");
    }).catch(() => { if (!controller.signal.aborted) setError("lotusFormsFailed"); });
    return () => controller.abort();
  }, [key, adultId, miniId, attempt]);
  const current = forms?.key === key ? forms : null;
  return { adult: current?.adult ?? null, mini: current?.mini ?? null, loading: !!key && !current && !error, error: error ? t(error) : "", retry: () => { setError(""); setAttempt(a => a + 1); } };
}
