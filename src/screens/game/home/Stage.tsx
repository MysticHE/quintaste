import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../../game/art";
import { SKINS } from "../../../game/content/cosmetics";
import { usePreferences } from "../../../state/Preferences";
import { useEnter } from "./Ambient";
import { wideSkinKey } from "./Scene";

/**
 * Full-bleed room. On wider screens the wide skin (the same room continued left and right, with the portrait room
 * pixel-exact in the middle) fills the sides; without one, or beyond its edges, a blurred copy does. Below the scene the
 * floor carries on as a mirror of its lowest strip, and above it the ceiling when the room sits lower, so tall phones
 * show one continuous room. Gentle scrims keep the status bar and controls readable.
 */
export function Stage({ skin, W, H, fit, insetTop, children }: {
  skin: string; W: number; H: number; fit: { width: number; left: number; top: number }; insetTop: number; children: ReactNode;
}) {
  const { theme } = usePreferences();
  const src = GAME_ART[SKINS[skin].art!], sh = fit.width * 1.5, enter = useEnter(0, 0, 1.04);
  const wideKey = wideSkinKey(skin), wide = fit.width < W && wideKey ? wideKey : null;
  const room = wide ? GAME_ART[wide] : src, roomW = wide ? sh * GAME_ART_SIZE[wide][0] / GAME_ART_SIZE[wide][1] : fit.width;
  const roomLeft = (fit.width - roomW) / 2, img = (top: number, flip: boolean) => <Image source={room} resizeMode="cover" accessibilityIgnoresInvertColors
    style={[s.abs, { left: roomLeft, top, width: roomW, height: sh }, flip && { transform: [{ scaleY: -1 }] }]} />;
  return <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
    {fit.left + roomLeft > 0 && <>
      <Image source={room} blurRadius={22} resizeMode="cover" style={[s.abs, { left: 0, top: 0, width: W, height: H }]} accessibilityIgnoresInvertColors />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: 0.55 }]} />
    </>}
    <Animated.View style={[s.abs, { left: fit.left, top: fit.top, width: fit.width, height: Math.max(sh, H - fit.top) }, enter]} pointerEvents="box-none">
      {fit.top > 0 && img(-sh, true)}
      {wide && img(0, false)}
      {H > fit.top + sh && img(sh, true)}
      {children}
    </Animated.View>
    <LinearGradient pointerEvents="none" colors={[theme.overlay, theme.transparent]} style={[s.abs, { left: 0, right: 0, top: 0, height: insetTop + 36 + Math.max(0, fit.top) }]} />
    <LinearGradient pointerEvents="none" colors={[theme.transparent, theme.overlay]} style={[s.abs, { left: 0, right: 0, bottom: 0, height: Math.min(H * 0.34, 300) }]} />
  </View>;
}
const s = StyleSheet.create({ abs: { position: "absolute" } });
