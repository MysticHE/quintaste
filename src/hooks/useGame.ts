import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFood } from "../state/Food";
import { useAuth } from "../state/Auth";
import { usePreferences } from "../state/Preferences";
import { accountsEnabled } from "../services/auth-client";
import { ApiError } from "../services/community-api";
import { buyItem, finishRun, openRun } from "../services/game-api";
import { DECOR } from "../game/content/cosmetics";
import { withTier, type GameProgress } from "../game/progress";
import type { Action, Result } from "../game/sim/engine";
import { rulesVersion, type RunStart } from "../game/sim/replay";
import { applyRun } from "../game/special";
import { applyPending, applyServer, editQueue, markCafeChanged, requestGameSync, type PendingRun } from "../state/game-sync";
import { useLotus } from "./useLotus";

export type RunStatus = "settled" | "pending" | "practice" | "rejected";
export type RunReward = { credits: number; first: boolean; mastered: boolean; unlocks: string[]; status?: RunStatus; note?: string;
  /** Personal bests this service beat ("score", "coins", "time") and whether it earned the level's bonus stamp for the first time. */
  beat?: string[]; bonus?: boolean };
/** A service as it starts: online attempts settle on the account; offline-started ones are local practice (PRD §17). */
export type StartedRun = { id: string; online: boolean; note?: string };
const none = { credits: 0, first: false, mastered: false, unlocks: [] as string[] };
/** Requests the server can never accept (a bad or unknown run): retrying would not help. */
const final = (error: unknown) => error instanceof ApiError && [400, 404, 413].includes(error.status);

/**
 * Game progress for the current owner. Guests keep it on the device, saved through the shared document queue.
 * Signed-in members' progress is the account's (server/game): runs settle by server replay, purchases go through the
 * ledger, and café changes save to the account in the background (components/game/GameSync). The lotus tier comes
 * from the account's lotus record (useLotus): reads and changes see it, and it is stripped before anything is saved.
 */
export function useGame() {
  const { doc, update, commit, owner } = useFood();
  const { user } = useAuth();
  const { setNotice } = usePreferences();
  const memberId = accountsEnabled && owner === "profile" && user?.adultConfirmed ? user.id : null;
  const { tier } = useLotus();
  const stored = doc.game;
  const game = useMemo(() => withTier(stored, tier), [stored, tier]);
  const tierRef = useRef(tier);
  useLayoutEffect(() => { tierRef.current = tier; }, [tier]);
  /** Every change sees the account's tier, and the stored copy never keeps one. */
  const tiered = useCallback((change: (game: GameProgress) => GameProgress) => (g: GameProgress) => ({ ...change({ ...g, tier: tierRef.current }), tier: null }), []);
  const updateGame = useCallback((change: (game: GameProgress) => GameProgress) => update(d => ({ ...d, game: tiered(change)(d.game) })), [update, tiered]);
  const set = useCallback(async (change: (game: GameProgress) => GameProgress) => {
    const ok = await updateGame(change);
    if (ok && memberId) markCafeChanged(memberId);
    return ok;
  }, [updateGame, memberId]);
  /** For results and purchases: persists before resolving so a crash never loses earned credits. */
  const save = useCallback(async (change: (game: GameProgress) => GameProgress) => {
    const ok = await commit(d => ({ ...d, game: tiered(change)(d.game) }));
    if (ok && memberId) markCafeChanged(memberId);
    return ok;
  }, [commit, memberId, tiered]);

  /** Buys decor with credits after the member confirmed. Members buy on the account and need a connection. */
  const buy = useCallback(async (id: string) => {
    const price = DECOR[id]?.unlock.kind === "credits" ? DECOR[id].unlock.price : null;
    if (price === null) return false;
    if (!memberId) return commit(d => d.game.credits < price || d.game.owned.includes(id) ? d
      : { ...d, game: { ...d.game, credits: d.game.credits - price, owned: [...d.game.owned, id] } });
    try { return await applyServer(memberId, await buyItem(id), updateGame); }
    catch (error) {
      setNotice({ text: error instanceof ApiError && error.code === "OFFLINE" ? "Connect to the internet to buy with café credits." : error instanceof Error ? error.message : "That did not work. Try again.", error: true });
      return false;
    }
  }, [memberId, commit, updateGame, setNotice]);

  /** Opens the attempt on the account when the service starts (under the id that seeded it). Null for guests. */
  const startRun = useCallback(async (setup: RunStart): Promise<StartedRun | null> => {
    if (!memberId) return null;
    const id = setup.id;
    try { await openRun(id, setup, rulesVersion); return { id, online: true }; }
    catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      return { id, online: false, note: code === "GAME_UPDATE" ? "Update QuinTaste to save game progress to your account."
        : code === "PET_LOCKED" ? "This companion isn't unlocked on your account yet."
        : "You were offline when this service started, so it's practice and isn't saved to your account." };
    }
  }, [memberId]);

  /**
   * Saves a finished service and returns the reward line. Guests: applied on the device. Members: queued first, shown at
   * once as pending, then settled by the server; a settled or refused answer replaces the pending one.
   */
  const finish = useCallback(async (started: Promise<StartedRun | null> | null, setup: RunStart, actions: Action[], result: Result): Promise<RunReward> => {
    if (!memberId) {
      let reward: RunReward = none;
      const ok = await commit(d => ({ ...d, game: tiered(g => { const r = applyRun(g, setup, result); reward = r.reward; return { ...r.game, mode: "rush" as const }; })(d.game) }));
      if (!ok) throw new Error("Progress not saved");
      return reward;
    }
    const run = started ? await started : null;
    if (!run?.online) return { ...none, status: "practice", note: run?.note ?? "This service is practice and isn't saved to your account." };
    const pending: PendingRun = { id: run.id, setup, actions, result, finishedAt: Date.now() };
    await editQueue(memberId, q => ({ ...q, runs: [...q.runs.filter(r => r.id !== run.id), pending] }));
    const provisional = await applyPending(memberId, pending, updateGame) ?? none;
    try {
      const out = await finishRun(run.id, actions, result);
      await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
      await applyServer(memberId, out.progress, updateGame);
      return out.status === "settled" ? { ...out.reward, status: "settled" }
        : { ...none, status: "rejected", note: "This service couldn't be confirmed, so it earned no credits." };
    } catch (error) {
      if (final(error)) {
        await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
        requestGameSync();
        return { ...none, status: "rejected", note: "This service couldn't be confirmed, so it earned no credits." };
      }
      requestGameSync();
      return { ...provisional, status: "pending", note: "Saved on this phone. It reaches your account when you're back online." };
    }
  }, [memberId, commit, updateGame, tiered]);

  return { game, set, save, buy, startRun, finish, member: !!memberId, tier };
}
