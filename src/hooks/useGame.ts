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
import { useT } from "../i18n";

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
/** The account whose game this is: a signed-in, age-checked member playing on their profile. Guests (null) keep progress on the device. */
export function useGameMemberId() {
  const { owner } = useFood(), { user } = useAuth();
  return accountsEnabled && owner === "profile" && user?.adultConfirmed ? user.id : null;
}

export function useGame() {
  const { doc, update, commit } = useFood();
  const { setNotice } = usePreferences(), t = useT("game");
  const memberId = useGameMemberId();
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
      setNotice({ text: error instanceof ApiError && error.code === "OFFLINE" ? t("connectToBuy") : error instanceof Error ? error.message : t("didNotWork"), error: true });
      return false;
    }
  }, [memberId, commit, updateGame, setNotice, t]);

  /** Opens the attempt on the account when the service starts (under the id that seeded it). Null for guests. */
  const startRun = useCallback(async (setup: RunStart): Promise<StartedRun | null> => {
    if (!memberId) return null;
    const id = setup.id;
    try { await openRun(id, setup, rulesVersion); return { id, online: true }; }
    catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      return { id, online: false, note: code === "GAME_UPDATE" ? t("updateToSave")
        : code === "PET_LOCKED" ? t("petNotUnlocked")
        : code === "TECHNIQUE_LOCKED" || code === "TIER_LOCKED" || code === "LEVEL_UNAVAILABLE" || code === "SEASON_LOCKED" || code === "SEASONS_OFF" || code === "CAFE_CLOSED" || code === "CAFE_CHANGED"
          || code === "SERVICE_PAUSED" ? (error as Error).message + t("practiceSuffix")
        : t("offlinePractice") };
    }
  }, [memberId, t]);

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
    if (!run?.online) return { ...none, status: "practice", note: run?.note ?? t("practiceNote") };
    const pending: PendingRun = { id: run.id, setup, actions, result, finishedAt: Date.now() };
    await editQueue(memberId, q => ({ ...q, runs: [...q.runs.filter(r => r.id !== run.id), pending] }));
    const provisional = await applyPending(memberId, pending, updateGame) ?? none;
    try {
      const out = await finishRun(run.id, actions, result);
      await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
      await applyServer(memberId, out.progress, updateGame);
      return out.status === "settled" ? { ...out.reward, status: "settled" }
        : { ...none, status: "rejected", note: t("runNotConfirmed") };
    } catch (error) {
      if (final(error)) {
        await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
        requestGameSync();
        return { ...none, status: "rejected", note: t("runNotConfirmed") };
      }
      requestGameSync();
      return { ...provisional, status: "pending", note: t("savedOnPhone") };
    }
  }, [memberId, commit, updateGame, tiered, t]);

  return { game, set, save, buy, startRun, finish, member: !!memberId, tier };
}
