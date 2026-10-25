import { router, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlassNavigation } from "../../components/navigation/GlassNavigation";
import { Icon, T } from "../../components/ui";
import { useCafeFeedback } from "../../game/cafe-feedback";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import { PETS, SKINS, wearArt } from "../../game/content/cosmetics";
import { LEVELS } from "../../game/content/levels";
import { cleared, nextLevel } from "../../game/progress";
import { useGame } from "../../hooks/useGame";
import { usePreferences } from "../../state/Preferences";
import { Glint, Motes, useEnter } from "./home/Ambient";
import { backBox, WIDE_SCALE } from "./home/sceneLayout";
import { wideSkinKey } from "./home/Scene";
import { Leaves, SunRays } from "./home/SceneFx";
import { SlideToEnter } from "./home/SlideToEnter";
import { LobbyCast } from "./LobbyCast";
import { useT } from "../../i18n";

/**
 * The Game tab, full screen behind the app's bottom navigation (docs/game/LOBBY_MOTION_PLAN.md): the café room with
 * sunbeams, dust and falling leaves, the cook and companion cooking, the café's name and progress at the top, and
 * Slide to enter centred under the cast. Entering zooms into the room with a warm flash, then opens /game/cafe.
 */
export function GameLobby() {
  const { theme, reducedMotion } = usePreferences();
  const { game } = useGame(), t = useT("game");
  const focused = useIsFocused();
  const { sound, buzz } = useCafeFeedback(game.settings, focused);
  const insets = useSafeAreaInsets(), dock = useGlassNavigation()?.height ?? 0;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const zoom = useSharedValue(0);
  // Light and dust wait for the room, so they never draw over an empty screen while the art loads.
  const [roomReady, setRoomReady] = useState(false);
  const n = nextLevel(game), allDone = cleared(game, LEVELS.length), lv = LEVELS[n - 1];
  const stars = Object.values(game.best).reduce((a, b) => a + b.stars, 0);
  const skin = SKINS[game.skin]?.art && GAME_ART[SKINS[game.skin].art!] ? SKINS[game.skin] : SKINS.sunny;
  const petKey = GAME_ART[wearArt(game.pet, game.equip[game.pet] ?? null)] ? wearArt(game.pet, game.equip[game.pet] ?? null) : PETS[game.pet].art;
  const roomIn = useEnter(0, 0, 1.04), infoIn = useEnter(220, -14), slideIn = useEnter(320, 18);
  // Coming back from the café: the room settles back and the slider starts fresh.
  const entering = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Leaving the tab drops an entry still waiting to open the café (another tab was chosen), and the room settles back
  // once the café has covered it, so it is never seen zoomed and washed out on the way back.
  useEffect(() => {
    if (focused) return;
    clearTimeout(entering.current);
    const settle = setTimeout(() => zoom.set(0), 600);
    return () => clearTimeout(settle);
  }, [focused, zoom]);
  useEffect(() => () => clearTimeout(entering.current), []);

  // The room keeps its 2:3 shape and shows the window and floor, so the cook and companion stand on it at any size.
  // Wider screens use the wide skin (the same room continued left and right) when QT Gamer has made one.
  const wide = box.w > box.h * 0.75 ? wideSkinKey(skin.id) : null, aspect = wide ? GAME_ART_SIZE[wide][0] / GAME_ART_SIZE[wide][1] : 2 / 3;
  const imgW = Math.max(box.w, box.h * aspect), imgH = imgW / aspect, imgTop = Math.max(box.h - imgH, Math.min(0, (box.h - imgH) * 0.6));
  const roomW = wide ? imgW / WIDE_SCALE : imgW, roomLeft = (box.w - roomW) / 2, u = roomW / 100;
  const slideW = Math.min(320, box.w - 48), slideBottom = dock + 28;
  const castW = Math.min(box.w, box.h * 0.6), castH = box.h * 0.36, castBottom = slideBottom + 60 + 14;

  const enter = () => {
    buzz("done"); sound("enter");
    if (reducedMotion) { router.push("/game/cafe"); return; }
    zoom.set(withTiming(1, { duration: 480, easing: Easing.in(Easing.cubic) }));
    entering.current = setTimeout(() => router.push("/game/cafe"), 420);
  };
  const room = useAnimatedStyle(() => ({ transform: [{ scale: 1 + zoom.value * 0.22 }] }));
  const flash = useAnimatedStyle(() => ({ opacity: zoom.value * 0.85 }));

  return <View style={[s.root, { backgroundColor: theme.mediaSurface }]} onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
    <StatusBar style="light" />
    {box.w > 0 && <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, roomIn]}>
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transformOrigin: `50% ${Math.round(((box.h - castBottom - castH * 0.5) / box.h) * 100)}%` }, room]}>
        <Image source={GAME_ART[wide ?? skin.art!]} resizeMode="cover" accessibilityIgnoresInvertColors onLoad={() => setRoomReady(true)}
          style={{ position: "absolute", top: imgTop, left: (box.w - imgW) / 2, width: imgW, height: imgH }} />
        {roomReady && <View pointerEvents="none" style={{ position: "absolute", left: roomLeft, top: imgTop, width: roomW, height: roomW * 1.5 }}>
          <SunRays box={backBox("window", skin.id)} u={u} />
          <Glint box={backBox("window", skin.id)} u={u} />
          <Motes u={u} />
          <Leaves u={u} />
        </View>}
        <LinearGradient pointerEvents="none" colors={[theme.overlay, theme.transparent]} style={[s.shadeTop, { height: insets.top + 150 }]} />
        <LinearGradient pointerEvents="none" colors={[theme.transparent, theme.overlay]} style={[s.shadeBottom, { height: castBottom + castH * 0.3 }]} />
        <View pointerEvents="box-none" style={[s.cast, { width: castW, height: castH, left: (box.w - castW) / 2, bottom: castBottom }]}>
          <LobbyCast width={castW} height={castH} petKey={petKey} onCook={() => { sound("boing"); buzz("tap"); }} onPet={() => { sound("boing"); buzz("tap"); }} />
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.lotus.ray }, flash]} />
    </Animated.View>}
    {box.w > 0 && <Animated.View style={[s.info, { top: insets.top + 10, left: insets.left + 20, right: insets.right + 84 }, infoIn]}>
      <T variant="small" color={theme.mediaRating} style={s.eyebrow} numberOfLines={1}>{allDone ? t("allLevelsCleared", { n: LEVELS.length }) : t("levelName", { n, name: lv.name })}</T>
      <T variant="title" color={theme.mediaForeground} numberOfLines={1} accessibilityRole="header" style={s.name}>{game.cafeName}</T>
      <View style={s.stats}>
        <Stat icon="star" text={stars + " / " + LEVELS.length * 3} label={t("starsOf", { stars, total: LEVELS.length * 3 })} />
        <View style={[s.dot, { backgroundColor: theme.mediaDivider }]} />
        <Stat icon="sparkles" text={t("credits", { n: game.credits })} label={t("cafeCredits", { n: game.credits })} />
      </View>
    </Animated.View>}
    {box.w > 0 && <Animated.View style={[s.slide, { bottom: slideBottom, left: (box.w - slideW) / 2 }, slideIn]}>
      <SlideToEnter key={focused ? "here" : "away"} width={slideW} title={t("slideToEnter")} label={t("enterCafe", { name: game.cafeName })} onTick={() => buzz("tick")} onComplete={enter} />
    </Animated.View>}
  </View>;
}

function Stat({ icon, text, label }: { icon: "star" | "sparkles"; text: string; label: string }) {
  const { theme } = usePreferences();
  return <View style={s.stat} accessibilityLabel={label}>
    <Icon name={icon} size={13} color={theme.mediaRating} /><T variant="small" color={theme.mediaMutedForeground} style={s.statText} numberOfLines={1}>{text}</T>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  cast: { position: "absolute" },
  shadeTop: { position: "absolute", left: 0, right: 0, top: 0 },
  shadeBottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  info: { position: "absolute", gap: 2 },
  eyebrow: { fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", fontSize: 11 },
  name: { fontWeight: "900", fontSize: 28, lineHeight: 34 },
  stats: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2 },
  slide: { position: "absolute" },
});
