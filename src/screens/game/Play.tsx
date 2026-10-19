import * as Haptics from "expo-haptics";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gameEnabled } from "../../config/game";
import { cookRecipeId, nearbyTerm, openNearby, openRecipe } from "../../game/bridges";
import { PETS, wearArt } from "../../game/content/cosmetics";
import { LEVELS, levelDishes } from "../../game/content/levels";
import { GAME_PAGE_PATH, gameArtUris, gameHost } from "../../game/artUris";
import { highestCleared, levelOpen } from "../../game/progress";
import { textScale } from "../../game/settings";
import { specialFor } from "../../game/special";
import type { BridgeKind, FinishPayload, RunInfo } from "../../game/dom/RushHour";
import RushHour from "./RushHourHost";
import type { HapticKind } from "../../game/dom/useFeedback";
import { useGame, type RunReward, type StartedRun } from "../../hooks/useGame";
import { useGameSwitch } from "../../state/game-sync";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { PlaySettingsSheet } from "./home/PlaySettingsSheet";

const HAPTICS: Record<HapticKind, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), select: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

/**
 * Full-screen Rush Hour service. Results are saved before the reward line is shown (persist before publish). Members'
 * services open an attempt on the account when they start and settle by server replay when they finish.
 */
export function GamePlayScreen() {
  const params = useLocalSearchParams<{ level?: string; mode?: string; run?: string; special?: string }>();
  const { game, set, startRun, finish } = useGame();
  const on = useGameSwitch();
  const { ready } = useFood();
  const { reducedMotion, textMultiplier, theme } = usePreferences();
  const insets = useSafeAreaInsets();
  const level = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(params.level)) || 1));
  const mode = params.mode === "calm" ? "calm" : "rush";
  const top = highestCleared(game), day = typeof params.special === "string" ? params.special : null;
  const special = useMemo(() => (day ? specialFor(game, day) : null), [day, top]); // eslint-disable-line react-hooks/exhaustive-deps
  const art = useMemo(() => gameArtUris(), []);
  // Expo Go preview: the game page is not packaged with the app, so it loads from the web app (see gameHost), and that
  // page waits for its props (scripts/host-game-page.mjs). A before-content script also makes react-native-webview on
  // Android define the props when each page starts, not only when it finishes, for the page packaged in installed builds.
  const host = useMemo(() => gameHost(), []);
  const equipped = game.equip[game.pet] ?? null;
  const petArt = art[wearArt(game.pet, equipped)] ? wearArt(game.pet, equipped) : PETS[game.pet].art;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const finished = useRef<Promise<RunReward> | null>(null), started = useRef<Promise<StartedRun | null> | null>(null);
  useEffect(() => { finished.current = null; started.current = null; }, [params.run, level, day]);
  // Which bridges the app can open for this service's dishes (GAME_PLAN §11).
  const bridges = useMemo(() => Object.fromEntries((special ? levelDishes(special.level) : levelDishes(LEVELS[level - 1])).map(d =>
    [d.id, { cook: !!cookRecipeId(d.id), nearby: !!nearbyTerm(d.id) }])), [special, level]);

  const onStart = useCallback(async (run: RunInfo) => { finished.current = null; started.current = startRun(run); }, [startRun]);
  const onFinish = useCallback(async (p: FinishPayload) => {
    // One save per finished service: a repeated call (the Try again button) waits for the same save.
    finished.current ??= finish(started.current, { level: p.level, special: p.special, top: p.top, hints: p.hints, mode: p.mode, pet: p.pet, signature: p.signature }, p.actions, p.result);
    try { return await finished.current; } catch (error) { finished.current = null; throw error; }
  }, [finish]);
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

  // Android Back during a service asks first, so a stray press never throws the round away (iOS swipe-back is off below).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert("Leave this service?", "This round won't be saved.", [{ text: "Keep cooking", style: "cancel" }, { text: "Leave", style: "destructive", onPress: () => router.back() }]);
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!gameEnabled || !on) return <Redirect href="/game" />;
  if (!ready) return <View style={{ flex: 1 }} />;
  if (day ? !special : !levelOpen(game, level)) return <Redirect href="/game" />;
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <StatusBar hidden />
    <RushHour key={(params.run ?? "first") + (day ?? "")} level={level} special={special?.level} mode={mode} pet={game.pet} petArt={petArt} chefArt="avatar-lian" art={art}
      signature={game.signature} reduceMotion={reducedMotion} settings={game.settings} textScale={textScale(game.settings, textMultiplier)} bridges={bridges}
      onStart={onStart} onFinish={onFinish} onExit={onExit} onHaptic={onHaptic} onBridge={onBridge} onSettings={onSettings}
      dom={{ style: { flex: 1 }, useExpoDOMWebView: false, ...(host ? { overrideUri: host + GAME_PAGE_PATH } : {}), injectedJavaScriptBeforeContentLoaded: "true;", scrollEnabled: false, bounces: false, overScrollMode: "never", mediaPlaybackRequiresUserAction: true, textZoom: 100 }} />
    {settingsOpen && <PlaySettingsSheet settings={game.settings} onChange={next => set(g => ({ ...g, settings: next }))} onClose={() => setSettingsOpen(false)} />}
  </View>;
}
