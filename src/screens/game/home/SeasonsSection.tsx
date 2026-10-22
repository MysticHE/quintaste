import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T } from "../../../components/ui";
import { levelDishes } from "../../../game/content/levels";
import { featuredSeason, SEASONS, SEASONS_AFTER_LEVEL, seasonKey, seasonOpen, type Season } from "../../../game/content/seasons";
import { missingTechnique } from "../../../game/kitchen";
import { highestCleared, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { sgDay } from "../../../utils/sg-datetime";
import { Section } from "./GameSheet";
import { Art } from "./bits";

export type SeasonPick = { season: string; n: number };

/**
 * Seasons (GAME_CONTENT_PLAN §6): every season stays on this shelf for good, and the one around its festival is "Featured now"
 * (never a countdown). Six levels each, with stars; a level says what to learn first when it needs a station not yet learned.
 */
export function Seasons({ game, pick, onPick }: { game: GameProgress; pick: SeasonPick | null; onPick(p: SeasonPick): void }) {
  // Today's Singapore date, read once when the shelf opens.
  const [today] = useState(() => sgDay(Date.now()));
  const featured = featuredSeason(today)?.id, shown = SEASONS.filter(s => seasonOpen(s, __DEV__));
  const order = [...shown].sort((a, b) => Number(b.id === featured) - Number(a.id === featured));
  if (highestCleared(game) < SEASONS_AFTER_LEVEL) return <Section><T muted>Seasons open after Level {SEASONS_AFTER_LEVEL}.</T></Section>;
  if (!order.length) return <Section><T muted>No seasons yet.</T></Section>;
  return <>{order.map(s => <SeasonShelf key={s.id} season={s} featured={s.id === featured} game={game} pick={pick} onPick={onPick} />)}</>;
}

function SeasonShelf({ season, featured, game, pick, onPick }: { season: Season; featured: boolean; game: GameProgress; pick: SeasonPick | null; onPick(p: SeasonPick): void }) {
  const { theme } = usePreferences();
  return <Section title={season.name}>
    <View style={s.inline}>
      {featured && <View style={[s.badge, { backgroundColor: theme.accentSoft }]}><T variant="small" style={{ fontWeight: "800", color: theme.accent }}>Featured now</T></View>}
      {!season.signedOff && <View style={[s.badge, { backgroundColor: theme.muted }]}><T variant="small" muted>Not reviewed</T></View>}
    </View>
    <T variant="small" muted>{season.blurb}</T>
    {season.levels.map(lv => {
      const n = lv.season!.n, best = game.seasons[seasonKey(season.id, n)], locked = missingTechnique(game, lv.stations), selected = pick?.season === season.id && pick.n === n;
      return <Pressable key={n} onPress={() => onPick({ season: season.id, n })} accessibilityRole="button" accessibilityState={{ selected }}
        accessibilityLabel={"Level " + n + ", " + lv.name + (locked ? ", learn the " + locked.name + " in Level " + locked.level + " first" : best?.clears ? ", " + best.stars + " stars" : "")}
        style={({ pressed }) => [s.row, { borderColor: selected ? theme.accent : theme.transparent, opacity: pressed ? 0.85 : 1 }]}>
        <Art k={levelDishes(lv)[0]?.art ?? ""} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontWeight: "800" }} numberOfLines={1}>{n}. {lv.name}</T>
          {locked ? <View style={s.inline}><Icon name="lock-closed" size={13} color={theme.mutedForeground} /><T variant="small" muted numberOfLines={1}>
            {locked.level ? "Learn the " + locked.name.toLowerCase() + " in Level " + locked.level : "Update the app to play"}</T></View>
            : <View style={s.inline}>{[0, 1, 2].map(i => <Icon key={i} name="star" size={12} color={best?.clears && i < best.stars ? theme.warning : theme.border} />)}</View>}
        </View>
      </Pressable>;
    })}
  </Section>;
}

/** The sheet footer for the Seasons tab: start the picked level when it is open. */
export function SeasonStart({ game, pick, onPlay }: { game: GameProgress; pick: SeasonPick | null; onPlay(season: string, n: number): void }) {
  const lv = pick ? SEASONS.find(x => x.id === pick.season)?.levels[pick.n - 1] : undefined;
  if (!pick || !lv || highestCleared(game) < SEASONS_AFTER_LEVEL || missingTechnique(game, lv.stations)) return null;
  return <Button label={"Start Level " + pick.n} onPress={() => onPlay(pick.season, pick.n)} />;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, borderWidth: 2 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
});
