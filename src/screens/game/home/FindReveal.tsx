import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { T } from "../../../components/ui";
import { GAME_ART } from "../../../game/art";
import { ACCESSORIES, DECOR, PETS, SKINS, wearArt } from "../../../game/content/cosmetics";
import { usePreferences } from "../../../state/Preferences";
import { Art } from "./bits";
import { PlayButton } from "./Controls";
import { FindLight } from "./FindLight";

/** `level` orders the finds; `from` names what earned it ("Cleared Level 30", "Cleared Reunion kitchen 6"). */
export type Find = { kind: "accessory" | "pet" | "decor" | "skin"; id: string; level: number; from: string };
/**
 * One reveal for every new cosmetic (owner's "Your new find" board): what earned it, the find on a spotlight over the
 * dimmed café, what it is for, then the gold pill (Equip, Choose, Use, or Done) and Keep current look.
 */
export function FindReveal({ find, pet, onEquip, onKeep }: { find: Find; pet: string; onEquip(): void; onKeep(): void }) {
  const { theme, reducedMotion } = usePreferences(), { height } = useWindowDimensions();
  const item = find.kind === "accessory" ? ACCESSORIES[find.id] : find.kind === "pet" ? PETS[find.id] : find.kind === "decor" ? DECOR[find.id] : SKINS[find.id];
  const name = item.name, wearer = find.kind === "accessory" && GAME_ART[wearArt(pet, find.id)] ? wearArt(pet, find.id) : null;
  const art = find.kind === "skin" ? SKINS[find.id].art! : (item as { art: string }).art;
  const forWho = find.kind === "accessory" ? "For your companion" : find.kind === "pet" ? "A new companion" : find.kind === "decor" ? "For your café" : "A new café skin";
  const action = find.kind === "accessory" ? (wearer ? "Equip on " + PETS[pet].name : null) : find.kind === "pet" ? "Choose " + name : find.kind === "skin" ? "Use this skin" : null;
  // The spotlight shrinks (to 60%) on a short screen so everything fits; the page still scrolls if it cannot.
  const fit = Math.max(0.6, Math.min(1, (height - (wearer ? 470 : 360)) / 300));
  const enter = (i: number) => reducedMotion ? undefined : FadeInDown.delay(80 + i * 110).springify().damping(16).stiffness(150);
  return <Modal transparent visible animationType={reducedMotion ? "none" : "fade"} onRequestClose={onKeep} statusBarTranslucent>
    {/* Sized by the modal itself: on Android the window leaves out the status and navigation bars the modal covers. */}
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="findScrim" cx="50%" cy="44%" r="75%">
        <Stop offset="0" stopColor={theme.mediaSurface} stopOpacity={0.72} /><Stop offset="1" stopColor={theme.mediaSurface} stopOpacity={0.95} />
      </RadialGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#findScrim)" />
    </Svg>
    {/* Scrolls when a short screen or a large text size cannot fit it all, so the buttons are always reachable. */}
    <ScrollView contentContainerStyle={s.body} accessibilityViewIsModal bounces={false} showsVerticalScrollIndicator={false}>
      <Animated.View entering={enter(0)} style={s.head}>
        <View style={s.from}><Spark color={theme.mediaRating} /><T variant="small" color={theme.mediaRating} style={s.fromText}>{find.from}</T><Spark color={theme.mediaRating} /></View>
        <T variant="display" color={theme.mediaForeground} accessibilityRole="header" style={s.center}>Your new find</T>
      </Animated.View>
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(260)}>
        <FindLight art={art} size={find.kind === "skin" ? 176 : 136} still={reducedMotion} card={find.kind === "skin"} fit={fit} />
      </Animated.View>
      <Animated.View entering={enter(3)} style={s.head}>
        <T variant="title" color={theme.mediaForeground} style={s.center}>{name}</T>
        <T color={theme.mediaMutedForeground} style={s.center}>{forWho}</T>
        {wearer && <Art k={wearer} size={104} style={s.wearer} />}
      </Animated.View>
      <Animated.View entering={enter(4)} style={s.acts}>
        <PlayButton title={action ?? "Done"} icon={action ? "sparkles" : "checkmark"} onPlay={action ? onEquip : onKeep} />
        {action && <Pressable onPress={onKeep} accessibilityRole="button" hitSlop={4} style={({ pressed }) => [s.keep, { opacity: pressed ? 0.6 : 1 }]}>
          <T color={theme.mediaMutedForeground} style={s.keepText}>Keep current look</T>
        </Pressable>}
        <T variant="small" color={theme.mediaMutedForeground} style={[s.center, s.free]}>Free · cosmetic only</T>
      </Animated.View>
    </ScrollView>
  </Modal>;
}

/** A small gold diamond either side of what earned the find. */
function Spark({ color }: { color: string }) {
  return <Svg width={8} height={8} viewBox="-1 -1 2 2"><Rect x={-0.62} y={-0.62} width={1.24} height={1.24} fill={color} transform="rotate(45)" /></Svg>;
}

const s = StyleSheet.create({
  body: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32, gap: 4 },
  head: { alignItems: "center", gap: 6 },
  center: { textAlign: "center" },
  from: { flexDirection: "row", alignItems: "center", gap: 8 },
  fromText: { fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  wearer: { marginTop: 6 },
  acts: { alignItems: "center", gap: 6, marginTop: 18 },
  keep: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center" },
  keepText: { fontWeight: "700" },
  free: { opacity: 0.7, marginTop: 4 },
});
