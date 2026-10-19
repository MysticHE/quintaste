import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Icon, T, type IconName } from "../../../components/ui";
import { DECOR, DECOR_ORDER, unlockText } from "../../../game/content/cosmetics";
import { isUnlocked, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { Art } from "./bits";
import { SLOTS, type SlotId } from "./sceneLayout";

export function Pill({ text, icon, label, onPress, disabled, strong, shrink, children }: {
  text?: string; icon?: IconName; label: string; onPress?(): void; disabled?: boolean; strong?: boolean;
  /** Gives up width first on narrow screens (the café name). */
  shrink?: boolean; children?: React.ReactNode;
}) {
  const { theme } = usePreferences();
  const bg = strong ? theme.success : theme.card, fg = strong ? theme.actionForeground : theme.foreground;
  return <Pressable onPress={onPress} disabled={!onPress || disabled} accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={label} accessibilityState={{ disabled }}
    style={({ pressed }) => [s.pill, shrink && s.shrinkPill, { backgroundColor: bg, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
    {icon && <Icon name={icon} size={16} color={strong ? fg : theme.accent} />}
    {!!text && <T variant="small" color={fg} style={[s.pillText, shrink && s.shrink]} numberOfLines={1}>{text}</T>}{children}
  </Pressable>;
}

/** Café credits; the pill pops when the balance changes. */
export function CreditsPill({ credits }: { credits: number }) {
  const { reducedMotion } = usePreferences(), k = useSharedValue(1), last = useRef(credits);
  useEffect(() => {
    if (last.current === credits) return; last.current = credits;
    if (!reducedMotion) k.value = withSequence(withTiming(1.18, { duration: 140 }), withSpring(1, { damping: 7, stiffness: 180 }));
  }, [credits, reducedMotion, k]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return <Animated.View style={st}><Pill text={String(credits)} icon="sparkles" label={credits + " café credits"} /></Animated.View>;
}

/** The game's primary action (Play, Enter café): one compact gold pill with a soft breathing halo. */
export function PlayButton({ title, sub, onPlay, icon = "play", label }: { title: string; sub?: string; onPlay(): void; icon?: IconName; label?: string }) {
  const { theme, reducedMotion } = usePreferences(), t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) { cancelAnimation(t); t.value = 0; return; }
    t.value = withRepeat(withDelay(1200, withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) })), -1);
    return () => cancelAnimation(t);
  }, [reducedMotion, t]);
  const halo = useAnimatedStyle(() => ({ opacity: (1 - t.value) * 0.45, transform: [{ scaleX: 1 + t.value * 0.08 }, { scaleY: 1 + t.value * 0.3 }] }));
  return <View>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.halo, { backgroundColor: theme.mediaRating }, halo]} />
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? (sub ? title + ", " + sub : title)} onPress={onPlay}
      style={({ pressed }) => [s.play, { backgroundColor: theme.mediaRating, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={[s.playDot, { backgroundColor: theme.mediaSurface }]}><Icon name={icon} size={15} color={theme.mediaRating} /></View>
      <View style={s.playText}><T color={theme.mediaSurface} style={s.playTitle}>{title}</T>
        {!!sub && <T variant="small" color={theme.mediaSurface} numberOfLines={1} style={s.playSub}>{sub}</T>}</View>
    </Pressable>
  </View>;
}

/** Decorate tray: pick a spot in the room, then something from the inventory to put there. */
export function DecorTray({ game, draft, slot, height, onPut }: { game: GameProgress; draft: Record<string, string | null>; slot: SlotId | null; height: number; onPut(id: string | null): void }) {
  const { theme } = usePreferences();
  return <View style={[s.tray, { backgroundColor: theme.background, height }]}>
    {!slot ? <View style={s.trayEmpty}><Icon name="hand-left-outline" color={theme.accent} size={28} /><T variant="subtitle">Tap a spot in your café</T></View> : <>
      <T variant="subtitle">{SLOTS[slot].name}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tiles}>
        <TrayTile label="Empty" selected={!draft[slot]} onPress={() => onPut(null)} />
        {DECOR_ORDER.filter(id => DECOR[id].fits === SLOTS[slot].fits).map(id => {
          const ok = isUnlocked(game, DECOR[id].unlock, id), at = Object.keys(draft).find(k => draft[k] === id);
          return <TrayTile key={id} art={DECOR[id].art} label={DECOR[id].name} selected={draft[slot] === id} disabled={!ok}
            status={!ok ? unlockText(DECOR[id].unlock) : at === slot ? "Here" : at ? "Moves here" : "In inventory"} onPress={() => onPut(id)} />;
        })}
      </ScrollView></>}
  </View>;
}
function TrayTile({ art, label, status, selected, disabled, onPress }: { art?: string; label: string; status?: string; selected?: boolean; disabled?: boolean; onPress(): void }) {
  const { theme } = usePreferences();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label + (status ? ", " + status : "")} accessibilityState={{ selected, disabled }}
    style={[s.tile, { backgroundColor: theme.card, borderColor: selected ? theme.accent : theme.border, opacity: disabled ? 0.5 : 1 }]}>
    {art ? <Art k={art} size={48} /> : <Icon name="close" color={theme.mutedForeground} size={30} />}
    <T variant="small" style={s.tileLabel} numberOfLines={1}>{label}</T>
    {!!status && <T variant="small" muted style={{ fontSize: 10 }} numberOfLines={1}>{status}</T>}
  </Pressable>;
}

const s = StyleSheet.create({
  pill: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  pillText: { fontWeight: "800", maxWidth: 140 },
  shrink: { flexShrink: 1, minWidth: 0 },
  shrinkPill: { flexShrink: 1 },
  halo: { borderRadius: 26 },
  play: { minHeight: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 7, paddingRight: 20, maxWidth: 300 },
  playDot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  playText: { flexShrink: 1 },
  playTitle: { fontWeight: "900", fontSize: 16, lineHeight: 19 },
  playSub: { fontSize: 12, lineHeight: 15 },
  tray: { position: "absolute", left: 0, right: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 14, gap: 8 },
  trayEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  tiles: { flexDirection: "row", gap: 8, paddingRight: 8 },
  tile: { width: 84, borderRadius: 14, borderWidth: 2, padding: 6, alignItems: "center", gap: 2, minHeight: 48 },
  tileLabel: { fontWeight: "800", textAlign: "center" },
});
