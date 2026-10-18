import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlassNavigation } from "../../components/navigation/GlassNavigation";
import { MeButton } from "../../components/food/Controls";
import { Icon, T } from "../../components/ui";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import { PETS, SKINS, wearArt } from "../../game/content/cosmetics";
import { LEVELS } from "../../game/content/levels";
import { cleared, nextLevel } from "../../game/progress";
import { useGame } from "../../hooks/useGame";
import { usePreferences } from "../../state/Preferences";
import { Hop, Sway, useEnter } from "./home/Ambient";
import { PlayButton } from "./home/Controls";
import { wideSkinKey } from "./home/Scene";

/**
 * The Game tab, full screen behind the app's bottom navigation: the café room with the cook and companion, progress
 * and one way in. The café opens full screen at /game/cafe, with its own Back button to return here.
 */
export function GameLobby() {
  const { theme } = usePreferences();
  const { game } = useGame();
  const insets = useSafeAreaInsets(), dock = useGlassNavigation()?.height ?? 0;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const n = nextLevel(game), allDone = cleared(game, 20), lv = LEVELS[n - 1];
  const stars = Object.values(game.best).reduce((a, b) => a + b.stars, 0);
  const skin = SKINS[game.skin]?.art && GAME_ART[SKINS[game.skin].art!] ? SKINS[game.skin] : SKINS.sunny;
  const petKey = GAME_ART[wearArt(game.pet, game.equip[game.pet] ?? null)] ? wearArt(game.pet, game.equip[game.pet] ?? null) : PETS[game.pet].art;
  const roomIn = useEnter(0, 0, 1.04), infoIn = useEnter(220, 18);
  // The room keeps its 2:3 shape and shows the window and floor, so the cook and companion stand on it at any size.
  // Wider screens use the wide skin (the same room continued left and right) when QT Gamer has made one.
  const wide = box.w > box.h * 0.75 ? wideSkinKey(skin.id) : null, aspect = wide ? GAME_ART_SIZE[wide][0] / GAME_ART_SIZE[wide][1] : 2 / 3;
  const imgW = Math.max(box.w, box.h * aspect), imgH = imgW / aspect, castW = Math.min(box.w, box.h * 0.6), infoW = Math.min(box.w - 32, 520);
  return <View style={[s.root, { backgroundColor: theme.mediaSurface }]} onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
    <StatusBar style="light" />
    {box.w > 0 && <Animated.View style={[StyleSheet.absoluteFill, roomIn]} pointerEvents="none">
      <Image source={GAME_ART[wide ?? skin.art!]} resizeMode="cover" accessibilityIgnoresInvertColors
        style={{ position: "absolute", top: Math.max(box.h - imgH, Math.min(0, (box.h - imgH) * 0.6)), left: (box.w - imgW) / 2, width: imgW, height: imgH }} />
      <View style={[s.cast, { width: castW, left: (box.w - castW) / 2, bottom: dock + box.h * 0.2, height: box.h * 0.36 }]}>
        <Sway style={s.cook} deg={0.9} origin="bottom" duration={1900}><Image source={GAME_ART["avatar-lian"]} style={s.fill} resizeMode="contain" /></Sway>
        <Hop style={s.pet} u={3}><Image source={GAME_ART[petKey]} style={s.fill} resizeMode="contain" /></Hop>
      </View>
      <LinearGradient colors={[theme.overlay, theme.transparent]} style={[s.shadeTop, { height: insets.top + 80 }]} />
      <LinearGradient colors={[theme.transparent, theme.overlay, theme.mediaSurface]} locations={[0, 0.5, 1]} style={[s.shadeBottom, { height: dock + box.h * 0.42 }]} />
    </Animated.View>}
    <View style={[s.me, { top: insets.top + 8, right: insets.right + 12 }]}><MeButton /></View>
    {box.w > 0 && <Animated.View style={[s.info, { bottom: dock + 22, width: infoW, left: (box.w - infoW) / 2 }, infoIn]}>
      <View style={s.text}>
        <T variant="small" color={theme.mediaRating} style={s.eyebrow} numberOfLines={1}>{allDone ? "All 20 levels cleared" : "Level " + n + " · " + lv.name}</T>
        <T variant="title" color={theme.mediaForeground} numberOfLines={1} accessibilityRole="header" style={s.name}>{game.cafeName}</T>
        <View style={s.stats}>
          <Stat icon="star" text={stars + " / 60"} label={stars + " of 60 stars"} />
          <View style={[s.dot, { backgroundColor: theme.mediaDivider }]} />
          <Stat icon="sparkles" text={game.credits + " credits"} label={game.credits + " café credits"} />
        </View>
      </View>
      <PlayButton title="Enter café" icon="arrow-forward" label={"Open " + game.cafeName} onPlay={() => router.push("/game/cafe")} />
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
  fill: { width: "100%", height: "100%" },
  cast: { position: "absolute", flexDirection: "row", justifyContent: "center", alignItems: "flex-end" },
  cook: { width: "50%", height: "100%" },
  pet: { width: "26%", height: "52%", marginLeft: "-8%" },
  shadeTop: { position: "absolute", left: 0, right: 0, top: 0 },
  shadeBottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  me: { position: "absolute" },
  info: { position: "absolute", flexDirection: "row", alignItems: "flex-end", gap: 14 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", fontSize: 11 },
  name: { fontWeight: "900", fontSize: 28, lineHeight: 34 },
  stats: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
