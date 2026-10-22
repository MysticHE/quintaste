import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Action } from "../ReactionBar";
import { useGameMemberId } from "../../hooks/useGame";
import { useRemote } from "../../hooks/useRemote";
import { ApiError } from "../../services/community-api";
import { fetchMyLevels, requestLevel } from "../../services/game-api";
import { usePreferences } from "../../state/Preferences";

/**
 * A member's own published recipe can become a private Rush Hour level (GAME_CONTENT_PLAN Phase 4). Making one is an AI feature, so
 * it needs an AI Recipes plan; while the level is in line the action shows it, and once made the recipe's Play action takes over.
 */
export function MakeLevelAction({ recipeId, onReady }: { recipeId: string; onReady(): void }) {
  const { theme, setNotice } = usePreferences(), memberId = useGameMemberId(), [busy, setBusy] = useState(false);
  const previous = useRef<string | null>(null);
  // Only the author of a recipe sees this, on that recipe's page, so a steady poll is cheap and needs no extra state.
  const mine = useRemote(memberId ? "game-levels-mine" : null, signal => fetchMyLevels(signal), 8000);
  const job = mine.data?.levels.find(l => l.recipeId === recipeId);
  // A level that finished while the recipe was open: the shelf reloads so Play appears; a failure says why, once.
  useEffect(() => {
    const key = job ? job.id + job.status : null;
    if (!job || previous.current === key) return;
    const was = previous.current; previous.current = key;
    if (was === null) return;
    if (job.status === "done") onReady();
    if (job.status === "failed" && job.message) setNotice({ text: job.message });
  }, [job, onReady, setNotice]);
  if (!memberId) return null;
  const make = async () => {
    setBusy(true);
    try {
      const out = await requestLevel(recipeId);
      if (out.status === "ready") onReady(); else mine.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "PLAN_REQUIRED") router.push("/cook/ai-plans");
      else setNotice({ text: error instanceof ApiError ? error.message : "That did not send. Try again." });
    } finally { setBusy(false); }
  };
  return <Action icon="game-controller-outline" color={theme.foreground} busy={busy || job?.status === "waiting"}
    label={job?.status === "waiting" ? "Your game level is being made" : "Make a game level from this recipe"} onPress={() => void make()} />;
}
