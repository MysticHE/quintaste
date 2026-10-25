import { useEffect, useRef } from "react";
import { useSocialMe } from "../components/social/SocialState";
import { invalidate } from "./useRemote";
import { saveProfile } from "../services/social-api";
import { usePreferences } from "../state/Preferences";

/**
 * One diet setting (owner, 25 Oct 2026): Food Choices decides the diet labels on the member's Social profile. When they
 * differ, the profile is saved with Food Choices' labels; members without a Social profile are left alone.
 */
export function useProfileDietSync() {
  const diets = usePreferences().draft.diets, me = useSocialMe().data, tried = useRef("");
  useEffect(() => {
    if (!me?.hasProfile || !diets.length) return;
    const want = [...diets].sort().join(","), have = [...me.profile.diets].sort().join(",");
    // One attempt per wanted set, so a failing save is not retried on every render.
    if (want === have || tried.current === want) return;
    tried.current = want;
    void saveProfile({ ...me.profile, diets }).then(() => invalidate("/api/social/me")).catch(() => { tried.current = ""; });
  }, [diets, me]);
}
