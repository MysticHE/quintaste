import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { gameEnabled } from "../../config/game";
import { cookRecipeId, nearbyTerm, openNearby, openRecipe } from "../../game/bridges";
import { PETS, wearArt } from "../../game/content/cosmetics";
import { LEVELS, levelDishes } from "../../game/content/levels";
import { gameArtUris } from "../../game/artUris";
import { applyResult, highestCleared, levelOpen } from "../../game/progress";
import { textScale } from "../../game/settings";
import { applySpecial, specialFor } from "../../game/special";
import RushHour, { type BridgeKind, type FinishPayload } from "../../game/dom/RushHour";
import type { HapticKind } from "../../game/dom/useFeedback";
import { useGame } from "../../hooks/useGame";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { PlaySettingsSheet } from "./home/PlaySettingsSheet";

const HAPTICS: Record<HapticKind, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), select: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

/** Full-screen Rush Hour service. Results are saved before the reward line is shown (persist before publish). */
export function GamePlayScreen() {
  const params = useLocalSearchParams<{ level?: string; mode?: string; run?: string; special?: string }>();
  const { game, set, save } = useGame();
  const { ready } = useFood();
  const { reducedMotion, textMultiplier } = usePreferences();
  const level = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(params.level)) || 1));
  const mode = params.mode === "calm" ? "calm" : "rush";
  const top = highestCleared(game), day = typeof params.special === "string" ? params.special : null;
  const special = useMemo(() => (day ? specialFor(game, day) : null), [day, top]); // eslint-disable-line react-hooks/exhaustive-deps
  const art = useMemo(() => gameArtUris(), []);
  const equipped = game.equip[game.pet] ?? null;
  const petArt = art[wearArt(game.pet, equipped)] ? wearArt(game.pet, equipped) : PETS[game.pet].art;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const finished = useRef(false);
  useEffect(() => { finished.current = false; }, [params.run, level, day]);
  // Which bridges the app can open for this service's dishes (GAME_PLAN §11).
  const bridges = useMemo(() => Object.fromEntries((special ? levelDishes(special.level) : levelDishes(LEVELS[level - 1])).map(d =>
    [d.id, { cook: !!cookRecipeId(d.id), nearby: !!nearbyTerm(d.id) }])), [special, level]);

  const onFinish = useCallback(async (p: FinishPayload) => {
    let reward = { credits: 0, first: false, mastered: false, unlocks: [] as string[] };
    if (finished.current) return reward;
    finished.current = true;
    const ok = await save(g => { const r = p.special ? applySpecial(g, p.result) : applyResult(g, p.level, p.result); reward = r.reward; return { ...r.game, mode: p.mode }; });
    if (!ok) { finished.current = false; throw new Error("Progress not saved"); }
    return reward;
  }, [save]);
  const onExit = useCallback(async (to: "cafe" | "next" | "again") => {
    if (to === "cafe") { if (router.canGoBack()) router.back(); else router.replace("/game/cafe"); return; }
    const n = to === "next" ? Math.min(LEVELS.length, level + 1) : level;
    router.replace({ pathname: "/game/play", params: { level: String(n), mode, run: String(Date.now()), ...(day && to === "again" ? { special: day } : {}) } });
  }, [level, mode, day]);
  const onHaptic = useCallback(async (kind: HapticKind) => { if (game.settings.haptics) await HAPTICS[kind]?.().catch(() => {}); }, [game.settings.haptics]);
  const onBridge = useCallback(async (kind: BridgeKind, dish: string, alliumFree: boolean) => {
    const target = kind === "cook" ? cookRecipeId(dish, alliumFree) : nearbyTerm(dish);
    if (target) (kind === "cook" ? openRecipe : openNearby)(target);
  }, []);
  const onSettings = useCallback(async () => setSettingsOpen(true), []);

  if (!gameEnabled) return <Redirect href="/game" />;
  if (!ready) return <View style={{ flex: 1 }} />;
  if (day ? !special : !levelOpen(game, level)) return <Redirect href="/game" />;
  return <View style={{ flex: 1 }}>
    <StatusBar hidden />
    <RushHour key={(params.run ?? "first") + (day ?? "")} level={level} special={special?.level} mode={mode} pet={game.pet} petArt={petArt} chefArt="avatar-lian" art={art}
      signature={game.signature} reduceMotion={reducedMotion} settings={game.settings} textScale={textScale(game.settings, textMultiplier)} bridges={bridges}
      onFinish={onFinish} onExit={onExit} onHaptic={onHaptic} onBridge={onBridge} onSettings={onSettings}
      dom={{ style: { flex: 1 }, scrollEnabled: false, bounces: false, overScrollMode: "never", mediaPlaybackRequiresUserAction: true }} />
    {settingsOpen && <PlaySettingsSheet settings={game.settings} onChange={next => set(g => ({ ...g, settings: next }))} onClose={() => setSettingsOpen(false)} />}
  </View>;
}
