import * as Haptics from "expo-haptics";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gameEnabled } from "../../config/game";
import { cookRecipeId, nearbyTerm, openNearby, openRecipe } from "../../game/bridges";
import { PETS, wearArt } from "../../game/content/cosmetics";
import { LEVELS, levelDishes, SEASON_LEVELS } from "../../game/content/levels";
import { GAME_PAGE_PATH, gameArtUris, gameHost, withPictures } from "../../game/artUris";
import { packByHash, packHash, readPack, registerPack, type LevelPack } from "../../game/content/pack";
import { missionFor, TIERS, type Tier } from "../../game/mission";
import { seasonById, seasonKey, seasonLevel, seasonOpen, SEASONS_AFTER_LEVEL } from "../../game/content/seasons";
import { missingTechnique } from "../../game/kitchen";
import { ApiError } from "../../services/community-api";
import { fetchPack, fetchPublicPack, reactLevel } from "../../services/game-api";
import { keptPack, pruneRevoked, rememberPack } from "../../services/game-packs";
import { highestCleared, levelOpen } from "../../game/progress";
import { specialFor } from "../../game/special";
import type { BridgeKind, FinishPayload, RunInfo } from "../../game/dom/RushHour";
import RushHour from "./RushHourHost";
import type { HapticKind } from "../../game/dom/useFeedback";
import { useGame, type RunReward, type StartedRun } from "../../hooks/useGame";
import { useGameSwitch } from "../../state/game-sync";
import { GamePreferences } from "./GamePreferences";
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
  return <GamePreferences><PlayService /></GamePreferences>;
}

function PlayService() {
  const params = useLocalSearchParams<{ level?: string; run?: string; special?: string; pack?: string; tier?: string; season?: string; n?: string }>();
  const { game, set, startRun, finish, member } = useGame();
  // A Recipe Kitchen mission: the pack and its pictures come from the account, or the public route for signed-out players.
  const tier: Tier | null = TIERS.includes(params.tier as Tier) ? params.tier as Tier : null, packId = typeof params.pack === "string" && tier ? params.pack : null;
  const [loaded, setLoaded] = useState<{ pack: LevelPack; json: unknown; pictures: Record<string, string> } | null>(null);
  const [packError, setPackError] = useState(false);
  useEffect(() => {
    if (!packId) return;
    let live = true;
    // Online the level loads fresh and is kept for offline play; offline a kept level plays (as practice) unless staff hid it since.
    const online = (member ? fetchPack(packId) : fetchPublicPack(packId)).then(res => { void rememberPack(res); void pruneRevoked(); return res; });
    // An answer from the server (a hidden or unknown level) is final; only an unreachable server falls back to the kept copy.
    online.catch(error => {
      if (error instanceof ApiError && error.status > 0) throw error;
      return keptPack(packId).then(kept => { if (!kept) throw new Error("not kept"); return kept; });
    }).then(res => {
      const pack = readPack(res.pack);
      if (packHash(pack) !== packId) throw new Error("pack changed");
      registerPack(pack);
      if (live) setLoaded({ pack: packByHash(packId)!, json: res.pack, pictures: res.pictures });
    }).catch(() => { if (live) setPackError(true); });
    return () => { live = false; };
  }, [packId, member]);
  const mission = useMemo(() => (loaded && tier ? missionFor(loaded.pack, tier) : null), [loaded, tier]);
  // A level that needs a technique this player hasn't learned says where to learn it, then goes back.
  const locked = loaded ? missingTechnique(game, loaded.pack.techniques) : null;
  useEffect(() => {
    if (!locked) return;
    Alert.alert("Not open yet", locked.level ? "Learn the " + locked.name.toLowerCase() + " in Level " + locked.level + " first." : "Update QuinTaste to play this level.");
    if (router.canGoBack()) router.back(); else router.replace("/game");
  }, [locked?.station]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = useGameSwitch();
  const { ready } = useFood();
  const { reducedMotion, textMultiplier, theme } = usePreferences();
  const insets = useSafeAreaInsets();
  const level = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(params.level)) || 1));
  const top = highestCleared(game), day = typeof params.special === "string" ? params.special : null;
  const special = useMemo(() => (day ? specialFor(game, day) : null), [day, top]); // eslint-disable-line react-hooks/exhaustive-deps
  // A season level (content/seasons.ts): shown only once signed off (development builds play every season) and after Chapter 1.
  const seasonId = typeof params.season === "string" ? params.season : null, seasonN = Math.floor(Number(params.n)) || 0;
  const seasonLv = useMemo(() => { const sz = seasonId ? seasonById(seasonId) : undefined; return sz && seasonOpen(sz, __DEV__) ? seasonLevel(sz.id, seasonN) ?? null : null; }, [seasonId, seasonN]);
  const art = useMemo(() => (loaded ? withPictures(gameArtUris(), loaded.pictures) : gameArtUris()), [loaded]);
  // Expo Go preview: the game page is not packaged with the app, so it loads from the web app (see gameHost), and that
  // page waits for its props (scripts/host-game-page.mjs). A before-content script also makes react-native-webview on
  // Android define the props when each page starts, not only when it finishes, for the page packaged in installed builds.
  const host = useMemo(() => gameHost(), []);
  const equipped = game.equip[game.pet] ?? null;
  const petArt = art[wearArt(game.pet, equipped)] ? wearArt(game.pet, equipped) : PETS[game.pet].art;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const finished = useRef<Promise<RunReward> | null>(null), started = useRef<Promise<StartedRun | null> | null>(null);
  useEffect(() => { finished.current = null; started.current = null; }, [params.run, level, day, packId, tier, seasonId, seasonN]);
  // Which bridges the app can open for this service's dishes (GAME_PLAN §11).
  const bridges = useMemo(() => Object.fromEntries(levelDishes(mission ?? seasonLv ?? special?.level ?? LEVELS[level - 1]).map(d =>
    [d.id, { cook: !!cookRecipeId(d.id), nearby: !!nearbyTerm(d.id) }])), [mission, seasonLv, special, level]);

  const onStart = useCallback(async (run: RunInfo) => { finished.current = null; started.current = startRun(run); }, [startRun]);
  const onFinish = useCallback(async (p: FinishPayload) => {
    // One save per finished service: a repeated call (the Try again button) waits for the same save.
    finished.current ??= finish(started.current, { id: p.id, level: p.level, special: p.special, top: p.top, hints: p.hints, pet: p.pet, signature: p.signature, pack: p.pack, tier: p.tier, season: p.season }, p.actions, p.result);
    try { return await finished.current; } catch (error) { finished.current = null; throw error; }
  }, [finish]);
  const onExit = useCallback(async (to: "cafe" | "next" | "again") => {
    if (to === "cafe") { if (router.canGoBack()) router.back(); else router.replace("/game/cafe"); return; }
    if (packId && tier) {
      const next = to === "next" ? TIERS[TIERS.indexOf(tier) + 1] ?? tier : tier;
      router.replace({ pathname: "/game/play", params: { pack: packId, tier: next, run: String(Date.now()) } });
      return;
    }
    if (seasonId && seasonLv) {
      const next = to === "next" ? Math.min(SEASON_LEVELS, seasonN + 1) : seasonN;
      router.replace({ pathname: "/game/play", params: { season: seasonId, n: String(next), run: String(Date.now()) } });
      return;
    }
    const n = to === "next" ? Math.min(LEVELS.length, level + 1) : level;
    router.replace({ pathname: "/game/play", params: { level: String(n), run: String(Date.now()), ...(day && to === "again" ? { special: day } : {}) } });
  }, [level, day, packId, tier, seasonId, seasonN, seasonLv]);
  const onHaptic = useCallback(async (kind: HapticKind) => { if (game.settings.haptics) await HAPTICS[kind]?.().catch(() => {}); }, [game.settings.haptics]);
  const onBridge = useCallback(async (kind: BridgeKind, dish: string, alliumFree: boolean) => {
    const target = kind === "cook" ? cookRecipeId(dish, alliumFree) : nearbyTerm(dish);
    if (target) (kind === "cook" ? openRecipe : openNearby)(target);
  }, []);
  const onSettings = useCallback(async () => setSettingsOpen(true), []);
  // A reaction is a small extra: if it doesn't reach the account, the service itself is still saved.
  const onReact = useCallback(async (hash: string, liked: boolean | null) => { await reactLevel(hash, liked).catch(() => {}); }, []);

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
  if (packId) {
    // A level that is unavailable to this account (not signed in, withdrawn, someone else's) goes back to the game.
    if (packError) return <Redirect href="/game" />;
    if (!mission || !loaded || locked) return <View style={{ flex: 1 }} />;
  } else if (params.pack || params.tier) return <Redirect href="/game" />;
  else if (seasonId) { if (!seasonLv || highestCleared(game) < SEASONS_AFTER_LEVEL) return <Redirect href="/game" />; }
  else if (day ? !special : !levelOpen(game, level)) return <Redirect href="/game" />;
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <StatusBar hidden />
    <RushHour key={(params.run ?? "first") + (day ?? "") + (packId ?? "") + (tier ?? "") + (seasonId ?? "") + seasonN} level={level} special={seasonLv ?? special?.level} mission={loaded && tier ? { pack: loaded.json, tier } : undefined} pet={game.pet} petArt={petArt} chefArt="avatar-lian" art={art}
      signature={game.signature} reduceMotion={reducedMotion} settings={game.settings} textScale={textMultiplier} bridges={bridges}
      best={seasonLv && seasonId ? game.seasons[seasonKey(seasonId, seasonN)] ?? null : special || packId ? null : game.best[String(level)] ?? null}
      onStart={onStart} onFinish={onFinish} onExit={onExit} onHaptic={onHaptic} onBridge={onBridge} onSettings={onSettings} onReact={member ? onReact : undefined}
      dom={{ style: { flex: 1 }, useExpoDOMWebView: false, ...(host ? { overrideUri: host + GAME_PAGE_PATH } : {}), injectedJavaScriptBeforeContentLoaded: "true;", scrollEnabled: false, bounces: false, overScrollMode: "never", mediaPlaybackRequiresUserAction: true, textZoom: 100 }} />
    {settingsOpen && <PlaySettingsSheet settings={game.settings} onChange={next => set(g => ({ ...g, settings: next }))} onClose={() => setSettingsOpen(false)} />}
  </View>;
}
