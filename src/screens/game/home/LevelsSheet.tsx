import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, T } from "../../../components/ui";
import { PETS, SKILLS } from "../../../game/content/cosmetics";
import { LEVELS, levelDishes } from "../../../game/content/levels";
import { GUESTS, RULES } from "../../../game/content/guests";
import { levelOpen, nextLevel, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Art, Seg } from "./bits";

/** Rush Hour: the next level, Rush or Calm, the companion joining, and the twenty-level path. */
export function LevelsSheet({ game, onClose, onPlay, onCompanion, onMode }: {
  game: GameProgress; onClose(): void; onPlay(level: number, mode: "rush" | "calm"): void; onCompanion(): void; onMode(m: "rush" | "calm"): void;
}) {
  const { theme } = usePreferences();
  const [pick, setPick] = useState(nextLevel(game));
  const lv = LEVELS[pick - 1], pet = PETS[game.pet], skill = SKILLS[pet.skill];
  const mode = lv.round === null ? "calm" : game.mode;
  const guests = [...new Set(lv.orders.map(o => o.guest))];
  return <GameSheet title="Rush Hour" onClose={onClose}
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
      <View style={s.path}>{LEVELS.map(l => {
        const open = levelOpen(game, l.n), best = game.best[l.n], here = pick === l.n;
        return <Pressable key={l.n} disabled={!open} onPress={() => setPick(l.n)} accessibilityRole="button"
          accessibilityLabel={"Level " + l.n + ", " + l.name + (best?.clears ? ", " + best.stars + " stars" : open ? ", open" : ", locked")} accessibilityState={{ selected: here, disabled: !open }}
          style={[s.dot, { backgroundColor: best?.clears ? theme.successSoft : open ? theme.accentSoft : theme.muted, borderColor: here ? theme.accent : theme.transparent }]}>
          <T variant="small" style={{ fontWeight: "900" }} color={open ? theme.foreground : theme.mutedForeground}>{l.n}</T>
          <T variant="small" color={theme.warning} style={{ fontSize: 9, lineHeight: 10 }}>{best?.clears ? "★".repeat(best.stars) : ""}</T>
        </Pressable>;
      })}</View>
    </Section>
  </GameSheet>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6 },
  path: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
