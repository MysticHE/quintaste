import { useEffect, useRef } from "react";
import { useSocialMe } from "../components/social/SocialState";
import { invalidate } from "./useRemote";
import { saveProfile } from "../services/social-api";
import { usePreferences } from "../state/Preferences";

const key = (diets: readonly string[]) => [...diets].sort().join(",");

/**
 * One diet setting (owner, 25 Oct 2026): Food Choices decides the diet labels on the member's Social profile. Used on Food
 * Choices only, and saves only after the member changes their diets there: the stored choice seen on opening is never
 * pushed, so labels a member set on an older app stay until they choose again. Members without a Social profile are left alone.
 */
export function useProfileDietSync() {
  const { draft, storageReady } = usePreferences(), diets = draft.diets, me = useSocialMe().data;
  const seen = useRef<string | undefined>(undefined), sent = useRef("");
  useEffect(() => {
    if (!storageReady) return;
    const want = key(diets);
    if (seen.current === undefined) { seen.current = want; return; }
    if (want === seen.current || !diets.length || !me?.hasProfile) return;
    if (want === key(me.profile.diets)) { seen.current = want; return; }
    // One attempt per chosen set; a failed save is tried again on the member's next change.
    if (sent.current === want) return;
    sent.current = want;
    void saveProfile({ ...me.profile, diets }).then(() => { seen.current = want; invalidate("/api/social/me"); }).catch(() => { sent.current = ""; });
  }, [diets, me, storageReady]);
}
