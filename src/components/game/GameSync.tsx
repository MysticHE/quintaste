import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFood } from "../../state/Food";
import { useAuth } from "../../state/Auth";
import { usePreferences } from "../../state/Preferences";
import { accountsEnabled } from "../../services/auth-client";
import { ApiError } from "../../services/community-api";
import { fetchProgress, finishRun, importDeviceProgress, saveCafe, type ServerProgress } from "../../services/game-api";
import type { GameProgress } from "../../game/progress";
import { applyServer, cafeOf, cafeRev, editQueue, readQueue, refreshGameStatus, setSyncRequester } from "../../state/game-sync";
import { useT } from "../../i18n";
import type { GameT } from "../../screens/game/home/bits";

type SyncContext = { memberId: string; game: () => GameProgress; update: (change: (game: GameProgress) => GameProgress) => Promise<boolean>; notify: (text: string, error?: boolean) => void; t: GameT };
const state = { running: false, again: null as SyncContext | null };

/** One pass: import once, save café changes, settle queued runs, then refresh the device copy. Calls during a pass queue one more. */
async function syncAccount(ctx: SyncContext): Promise<void> {
  if (state.running) { state.again = ctx; return; }
  state.running = true;
  const { memberId } = ctx;
  try {
    if (!await refreshGameStatus()) return;
    let queue = await readQueue(memberId), server: ServerProgress | null = null;
    if (!queue.imported) {
      const before = ctx.game().credits;
      server = await importDeviceProgress(ctx.game());
      queue = await editQueue(memberId, q => ({ ...q, imported: true, cafeDirty: false }));
      // Credits earned on this phone before signing in stay off the account (owner, 23 Oct 2026); say so rather than let them vanish.
      if (before > server.game.credits) ctx.notify(ctx.t("creditsStayOnPhone"));
    } else if (queue.cafeDirty) {
      const rev = cafeRev();
      server = await saveCafe(cafeOf(ctx.game()));
      if (rev === cafeRev()) queue = await editQueue(memberId, q => ({ ...q, cafeDirty: false }));
    }
    for (const run of queue.runs) {
      try {
        const out = await finishRun(run.id, run.actions, run.result);
        server = out.progress;
        await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
        if (out.status === "settled") ctx.notify(out.reward.credits > 0 ? ctx.t("serviceSavedCredits", { n: out.reward.credits }) : ctx.t("serviceSaved"));
        else ctx.notify(ctx.t("serviceNotConfirmed"), true);
      } catch (error) {
        if (!(error instanceof ApiError && [400, 404, 413].includes(error.status))) throw error;
        await editQueue(memberId, q => ({ ...q, runs: q.runs.filter(r => r.id !== run.id) }));
      }
    }
    await applyServer(memberId, server ?? await fetchProgress(), ctx.update);
  } catch { /* offline or paused: the queue stays and the next resume or request tries again */ }
  finally {
    state.running = false;
    const next = state.again; state.again = null;
    if (next) void syncAccount(next);
  }
}

/**
 * Renders nothing. For signed-in members: merges this device's earlier game progress into the account once, saves café
 * changes, settles runs that finished offline and keeps the device copy in step with the account. Runs on sign-in,
 * on app resume and when the game asks. Guests' progress stays on the device and is never sent.
 */
export function GameSync() {
  const { doc, update, owner, ready, readable } = useFood();
  const { user } = useAuth();
  const { setNotice } = usePreferences(), t = useT("game");
  // Read at notice time, so a sync already running speaks the language chosen since.
  const say = useRef(t);
  useEffect(() => { say.current = t; }, [t]);
  const memberId = accountsEnabled && owner === "profile" && ready && readable && user?.adultConfirmed ? user.id : null;
  const latest = useRef(doc.game);
  useEffect(() => { latest.current = doc.game; }, [doc.game]);
  const updateGame = useCallback((change: (game: GameProgress) => GameProgress) => update(d => ({ ...d, game: change(d.game) })), [update]);

  useEffect(() => {
    if (!memberId) { void refreshGameStatus(); return; }
    const ctx: SyncContext = { memberId, game: () => latest.current, update: updateGame, notify: (text, error) => setNotice({ text, error }), t: (key, vars) => say.current(key, vars) };
    const run = () => void syncAccount(ctx);
    setSyncRequester(run);
    run();
    const sub = AppState.addEventListener("change", s => { if (s === "active") run(); });
    // While something waits to reach the account, try again every minute so reconnecting settles it.
    const retry = setInterval(() => void readQueue(memberId).then(q => { if (q.runs.length || q.cafeDirty) run(); }), 60000);
    return () => { setSyncRequester(null); sub.remove(); clearInterval(retry); };
  }, [memberId, updateGame, setNotice]);
  return null;
}
