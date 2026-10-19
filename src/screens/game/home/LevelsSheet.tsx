import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Button, Icon, T } from "../../../components/ui";
import { PETS, SKILLS } from "../../../game/content/cosmetics";
import { LEVELS, levelDishes } from "../../../game/content/levels";
import { GUESTS, RULES } from "../../../game/content/guests";
import { levelOpen, nextLevel, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Art, Seg, useHover } from "./bits";

/** Rush Hour: the next level, Rush or Calm, the companion joining, and the twenty-level path. */
export function LevelsSheet({ game, onClose, onPlay, onCompanion, onMode }: {
  game: GameProgress; onClose(): void; onPlay(level: number, mode: "rush" | "calm"): void; onCompanion(): void; onMode(m: "rush" | "calm"): void;
}) {
  const { theme } = usePreferences();
  const [pick, setPick] = useState(nextLevel(game));
  const lv = LEVELS[pick - 1], pet = PETS[game.pet], skill = SKILLS[pet.skill];
  const mode = lv.round === null ? "calm" : game.mode;
  const guests = [...new Set(lv.orders.map(o => o.guest))];
  return <GameSheet title="Rush Hour" subtitle={"Level " + pick + " · " + lv.name} art={levelDishes(lv)[0]?.art} onClose={onClose}
    footer={<Button label={"Start Level " + pick} onPress={() => onPlay(pick, mode)} />}>
    <Section>
      <T variant="small" muted>Level {pick}{game.best[pick]?.stars ? " · best " + "★".repeat(game.best[pick].stars) : ""}</T>
      <T variant="subtitle">{lv.name}</T>
      <T muted>{lv.brief}</T>
      <View style={s.row}>{levelDishes(lv).map(d => <View key={d.id} style={s.chip}><Art k={d.art} size={44} /><T variant="small" style={{ fontWeight: "700" }}>{d.name}</T></View>)}</View>
      <View style={s.row}>{guests.map(g => <View key={g} style={s.chip}><Art k={GUESTS[g].art} size={36} />
        <T variant="small" style={{ fontWeight: "700" }}>{GUESTS[g].name}{GUESTS[g].rules.length ? " · " + GUESTS[g].rules.map(r => RULES[r].chip).join(", ") : ""}</T></View>)}</View>
    </Section>
    {lv.round !== null && <Seg label="Mode" value={mode} onChange={onMode} options={[["rush", "Rush · clock and patience"], ["calm", "Calm · no clock"]]} />}
    <Pressable onPress={onCompanion} accessibilityRole="button" accessibilityLabel={"Companion " + pet.name + ", " + skill.name + ". Change companion"}>
      <Section><View style={s.row}><Art k={pet.art} size={52} /><View style={{ flex: 1 }}>
        <T style={{ fontWeight: "800" }}>{pet.name} · {skill.name}</T><T variant="small" muted>{mode === "calm" ? "Calm has no clock, so companions just keep you company." : skill.effect + " Once per service."}</T>
      </View><T variant="small" color={theme.accent} style={{ fontWeight: "800" }}>Change</T></View></Section>
    </Pressable>
    <Section title="Your path">
      <View style={s.path}>{LEVELS.map(l => <LevelNode key={l.n} n={l.n} name={l.name} open={levelOpen(game, l.n)} stars={game.best[l.n]?.clears ? game.best[l.n].stars : null}
        here={pick === l.n} next={nextLevel(game) === l.n} onPress={() => setPick(l.n)} />)}</View>
    </Section>
  </GameSheet>;
}
/** One stop on the level path: cleared stops show stars, locked ones a lock, and the next level pulses gently. */
function LevelNode({ n, name, open, stars, here, next, onPress }: { n: number; name: string; open: boolean; stars: number | null; here: boolean; next: boolean; onPress(): void }) {
  const { theme, reducedMotion } = usePreferences(), { hovered, hoverProps } = useHover(), t = useSharedValue(0);
  useEffect(() => {
    if (!next || reducedMotion) { cancelAnimation(t); t.value = 0; return; }
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1);
    return () => cancelAnimation(t);
  }, [next, reducedMotion, t]);
  const ring = useAnimatedStyle(() => ({ opacity: (1 - t.value) * 0.6, transform: [{ scale: 1 + t.value * 0.35 }] }));
  const bg = stars !== null ? theme.successSoft : open ? theme.accentSoft : theme.muted;
  return <Pressable disabled={!open} onPress={onPress} {...hoverProps} accessibilityRole="button" accessibilityState={{ selected: here, disabled: !open }}
    accessibilityLabel={"Level " + n + ", " + name + (stars !== null ? ", " + stars + " stars" : open ? ", open" : ", locked")}
    style={({ pressed }) => [s.dot, { backgroundColor: bg, borderColor: here ? theme.accent : theme.transparent, transform: [{ scale: pressed ? 0.92 : hovered && open ? 1.06 : 1 }] }]}>
    {next && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, { borderColor: theme.accent }, ring]} />}
    {open ? <T variant="small" style={{ fontWeight: "900" }}>{n}</T> : <Icon name="lock-closed" size={16} color={theme.mutedForeground} />}
    {stars !== null && <View style={s.stars}>{[0, 1, 2].map(i => <Icon key={i} name="star" size={9} color={i < stars ? theme.warning : theme.border} />)}</View>}
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6 },
  path: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 1 },
  ring: { borderRadius: 27, borderWidth: 2 },
  stars: { flexDirection: "row", gap: 1 },
});
