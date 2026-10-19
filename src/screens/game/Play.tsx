import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { gameEnabled } from "../../config/game";
import { PETS, wearArt } from "../../game/content/cosmetics";
import { LEVELS } from "../../game/content/levels";
import { gameArtUris } from "../../game/artUris";
import { levelOpen } from "../../game/progress";
import RushHour, { type FinishPayload, type RunInfo } from "../../game/dom/RushHour";
import { useGame, type RunReward, type StartedRun } from "../../hooks/useGame";
import { useGameSwitch } from "../../state/game-sync";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

/**
 * Full-screen Rush Hour service. Results are saved before the reward line is shown (persist before publish). Members'
 * services open an attempt on the account when they start and settle by server replay when they finish.
 */
export function GamePlayScreen() {
  const params = useLocalSearchParams<{ level?: string; mode?: string; run?: string }>();
  const { game, startRun, finish } = useGame();
  const on = useGameSwitch();
  const { ready } = useFood();
  const { reducedMotion } = usePreferences();
  const level = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(params.level)) || 1));
  const mode = params.mode === "calm" ? "calm" : "rush";
  const art = useMemo(() => gameArtUris(), []);
  const equipped = game.equip[game.pet] ?? null;
  const petArt = art[wearArt(game.pet, equipped)] ? wearArt(game.pet, equipped) : PETS[game.pet].art;
  const finished = useRef<Promise<RunReward> | null>(null), started = useRef<Promise<StartedRun | null> | null>(null);
  useEffect(() => { finished.current = null; started.current = null; }, [params.run, level]);

  const onStart = useCallback(async (run: RunInfo) => { finished.current = null; started.current = startRun(run); }, [startRun]);
  const onFinish = useCallback(async (p: FinishPayload) => {
    // One save per finished service: a repeated call (the Try again button) waits for the same save.
    finished.current ??= finish(started.current, { level: p.level, mode: p.mode, pet: p.pet, signature: p.signature }, p.actions, p.result);
    try { return await finished.current; } catch (error) { finished.current = null; throw error; }
  }, [finish]);
  const onExit = useCallback(async (to: "cafe" | "next" | "again") => {
    if (to === "cafe") { if (router.canGoBack()) router.back(); else router.replace("/game/cafe"); return; }
    const n = to === "next" ? Math.min(LEVELS.length, level + 1) : level;
    router.replace({ pathname: "/game/play", params: { level: String(n), mode, run: String(Date.now()) } });
  }, [level, mode]);

  if (!gameEnabled || !on) return <Redirect href="/game" />;
  if (!ready) return <View style={{ flex: 1 }} />;
  if (!levelOpen(game, level)) return <Redirect href="/game" />;
  return <View style={{ flex: 1 }}>
    <StatusBar hidden />
    <RushHour key={params.run ?? "first"} level={level} mode={mode} pet={game.pet} petArt={petArt} chefArt="avatar-lian" art={art}
      signature={game.signature} reduceMotion={reducedMotion} onStart={onStart} onFinish={onFinish} onExit={onExit}
      dom={{ style: { flex: 1 }, scrollEnabled: false, bounces: false, overScrollMode: "never", mediaPlaybackRequiresUserAction: true }} />
  </View>;
}
