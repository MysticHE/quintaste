import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { gameEnabled } from "../../config/game";
import { PETS, wearArt } from "../../game/content/cosmetics";
import { LEVELS } from "../../game/content/levels";
import { gameArtUris } from "../../game/artUris";
import { applyResult, levelOpen } from "../../game/progress";
import RushHour, { type FinishPayload } from "../../game/dom/RushHour";
import { useGame } from "../../hooks/useGame";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

/** Full-screen Rush Hour service. Results are saved before the reward line is shown (persist before publish). */
export function GamePlayScreen() {
  const params = useLocalSearchParams<{ level?: string; mode?: string; run?: string }>();
  const { game, save } = useGame();
  const { ready } = useFood();
  const { reducedMotion } = usePreferences();
  const level = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(params.level)) || 1));
  const mode = params.mode === "calm" ? "calm" : "rush";
  const art = useMemo(() => gameArtUris(), []);
  const equipped = game.equip[game.pet] ?? null;
  const petArt = art[wearArt(game.pet, equipped)] ? wearArt(game.pet, equipped) : PETS[game.pet].art;
  const finished = useRef(false);
  useEffect(() => { finished.current = false; }, [params.run, level]);

  const onFinish = useCallback(async (p: FinishPayload) => {
    let reward = { credits: 0, first: false, mastered: false, unlocks: [] as string[] };
    if (finished.current) return reward;
    finished.current = true;
    const ok = await save(g => { const r = applyResult(g, p.level, p.result); reward = r.reward; return { ...r.game, mode: p.mode }; });
    if (!ok) { finished.current = false; throw new Error("Progress not saved"); }
    return reward;
  }, [save]);
  const onExit = useCallback(async (to: "cafe" | "next" | "again") => {
    if (to === "cafe") { if (router.canGoBack()) router.back(); else router.replace("/game/cafe"); return; }
    const n = to === "next" ? Math.min(LEVELS.length, level + 1) : level;
    router.replace({ pathname: "/game/play", params: { level: String(n), mode, run: String(Date.now()) } });
  }, [level, mode]);

  if (!gameEnabled) return <Redirect href="/game" />;
  if (!ready) return <View style={{ flex: 1 }} />;
  if (!levelOpen(game, level)) return <Redirect href="/game" />;
  return <View style={{ flex: 1 }}>
    <StatusBar hidden />
    <RushHour key={params.run ?? "first"} level={level} mode={mode} pet={game.pet} petArt={petArt} chefArt="avatar-lian" art={art}
      signature={game.signature} reduceMotion={reducedMotion} onFinish={onFinish} onExit={onExit}
      dom={{ style: { flex: 1 }, scrollEnabled: false, bounces: false, overScrollMode: "never", mediaPlaybackRequiresUserAction: true }} />
  </View>;
}
