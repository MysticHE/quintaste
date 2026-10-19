import { useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Button, T } from "../../../components/ui";
import { GAME_ART } from "../../../game/art";
import { ACCESSORIES, DECOR, PETS, SKINS, wearArt } from "../../../game/content/cosmetics";
import { usePreferences } from "../../../state/Preferences";
import { Art } from "./bits";

export type Find = { kind: "accessory" | "pet" | "decor" | "skin"; id: string; level: number };
/** One reveal for every new cosmetic (owner's "Your new find" board): what it is, who it is for, then Equip or Keep. */
export function FindReveal({ find, pet, onEquip, onKeep }: { find: Find; pet: string; onEquip(): void; onKeep(): void }) {
  const { theme, reducedMotion } = usePreferences();
  const item = find.kind === "accessory" ? ACCESSORIES[find.id] : find.kind === "pet" ? PETS[find.id] : find.kind === "decor" ? DECOR[find.id] : SKINS[find.id];
  const name = item.name, wearer = find.kind === "accessory" && GAME_ART[wearArt(pet, find.id)] ? wearArt(pet, find.id) : null;
  const art = find.kind === "skin" ? SKINS[find.id].art! : (item as { art: string }).art;
  const forWho = find.kind === "accessory" ? "For your companion" : find.kind === "pet" ? "A new companion" : find.kind === "decor" ? "For your café" : "A new café skin";
  const action = find.kind === "accessory" ? (wearer ? "Equip on " + PETS[pet].name : null) : find.kind === "pet" ? "Choose " + name : find.kind === "skin" ? "Use this skin" : "Place it with Decorate";
  return <Modal transparent visible animationType={reducedMotion ? "none" : "fade"} onRequestClose={onKeep} statusBarTranslucent>
    <LinearGradient colors={[theme.mediaSurface, theme.shadow]} style={s.wrap}>
      <View style={s.body} accessibilityViewIsModal>
        <T variant="display" color={theme.mediaForeground} accessibilityRole="header">Your new find</T>
        <View style={[s.pill, { backgroundColor: theme.accentSoft }]}><T variant="small" color={theme.accent} style={{ fontWeight: "800" }}>Cleared Level {find.level}</T></View>
        <Pedestal art={art} size={find.kind === "skin" ? 150 : 130} still={reducedMotion} />
        <T variant="title" color={theme.mediaForeground}>{name}</T>
        <T color={theme.mediaMutedForeground}>{forWho}</T>
        {wearer && <Art k={wearer} size={120} />}
        <View style={s.acts}>
          {action && find.kind !== "decor" && <Button label={action} onPress={onEquip} />}
          <Button variant="secondary" label={find.kind === "decor" || !action ? "Done" : "Keep current look"} onPress={onKeep} />
          <T variant="small" color={theme.mediaMutedForeground} style={{ textAlign: "center" }}>Free · cosmetic only</T>
        </View>
      </View>
    </LinearGradient>
  </Modal>;
}
/** The find pops onto its pedestal while soft light rays turn slowly behind it. */
function Pedestal({ art, size, still }: { art: string; size: number; still: boolean }) {
  const { theme } = usePreferences(), pop = useSharedValue(still ? 1 : 0), spin = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    pop.value = withDelay(120, withSpring(1, { damping: 9, stiffness: 160 }));
    spin.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1);
    return () => cancelAnimation(spin);
  }, [still, pop, spin]);
  const item = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.4), transform: [{ scale: 0.4 + pop.value * 0.6 }] }));
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: spin.value * 360 + "deg" }] }));
  return <View style={s.stage}>
    {!still && <Animated.View pointerEvents="none" style={[s.rays, rays]}>
      {[0, 30, 60, 90, 120, 150].map(d => <View key={d} style={[s.ray, { backgroundColor: theme.mediaRating, transform: [{ rotate: d + "deg" }] }]} />)}
    </Animated.View>}
    <View style={[s.pedestal, { backgroundColor: theme.mediaDivider }]}><Animated.View style={item}><Art k={art} size={size} /></Animated.View></View>
  </View>;
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center" },
  body: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  pill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999 },
  stage: { width: 280, height: 230, alignItems: "center", justifyContent: "center" },
  rays: { position: "absolute", width: 280, height: 280, alignItems: "center", justifyContent: "center", opacity: 0.22 },
  ray: { position: "absolute", width: 26, height: 280, borderRadius: 13 },
  pedestal: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center" },
  acts: { alignSelf: "stretch", gap: 10, marginTop: 8 },
});
