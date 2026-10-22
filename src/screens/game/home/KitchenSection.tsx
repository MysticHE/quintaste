import { Image, Pressable, StyleSheet, View } from "react-native";
import { RemoteStatus, useMember } from "../../../components/CommunityGate";
import { Button, Icon, T } from "../../../components/ui";
import { TIER_NAMES } from "../../../game/content/levels";
import { missingTechnique } from "../../../game/kitchen";
import { TIERS, type Tier } from "../../../game/mission";
import type { GameProgress } from "../../../game/progress";
import { nextTier, tierOpen, useKitchen } from "../../../hooks/useKitchen";
import type { KitchenLevel } from "../../../services/game-api";
import { usePreferences } from "../../../state/Preferences";
import { apiUrl } from "../../../utils/api-url";
import { Section } from "./GameSheet";

export type KitchenPick = { level: KitchenLevel; tier: Tier };

/** Recipe levels grouped by cuisine, with tier progress and what to learn first; picking one shows its tiers. */
export function Kitchen({ game, pick, onPick }: { game: GameProgress; pick: KitchenPick | null; onPick(p: KitchenPick): void }) {
  const remote = useKitchen(), member = useMember();
  const levels = remote.data?.levels ?? [];
  const shelves = [...new Set(levels.map(l => l.cuisine ?? "More recipes"))].sort((a, b) => (a === "More recipes" ? 1 : b === "More recipes" ? -1 : a.localeCompare(b)));
  return <>
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/game/cafe" />
    {remote.data && !levels.length && <Section><T muted>No recipe levels yet.</T></Section>}
    {remote.data && !member.member && !!levels.length && <T variant="small" muted>Sign in to keep your Recipe Kitchen progress.</T>}
    {pick && <Tiers game={game} pick={pick} onPick={onPick} />}
    {shelves.map(shelf => <Section key={shelf} title={shelf}>
      {levels.filter(l => (l.cuisine ?? "More recipes") === shelf).map(l =>
        <Recipe key={l.hash} level={l} game={game} selected={pick?.level.hash === l.hash} onPress={() => onPick({ level: l, tier: nextTier(l) })} />)}
    </Section>)}
  </>;
}

function Picture({ level, size }: { level: KitchenLevel; size: number }) {
  const { theme } = usePreferences();
  let uri: string | null = null;
  try { uri = level.picture ? apiUrl(level.picture) : null; } catch { uri = null; }
  return uri ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    : <View style={[s.blank, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.muted }]}><Icon name="restaurant-outline" size={size * 0.45} color={theme.mutedForeground} /></View>;
}

function Recipe({ level, game, selected, onPress }: { level: KitchenLevel; game: GameProgress; selected: boolean; onPress(): void }) {
  const { theme } = usePreferences(), locked = missingTechnique(game, level.techniques);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
    accessibilityLabel={level.name + (locked ? ", learn the " + locked.name + " in Level " + locked.level + " first" : ", " + TIERS.filter(t => level.best[t]?.clears).length + " of 3 tiers cleared")}
    style={({ pressed }) => [s.row, { borderColor: selected ? theme.accent : theme.transparent, opacity: pressed ? 0.85 : 1 }]}>
    <Picture level={level} size={48} />
    <View style={{ flex: 1, gap: 2 }}>
      <T style={{ fontWeight: "800" }} numberOfLines={1}>{level.name}{level.mine ? " · Yours" : ""}</T>
      {locked ? <View style={s.inline}><Icon name="lock-closed" size={13} color={theme.mutedForeground} /><T variant="small" muted numberOfLines={1}>
        {locked.level ? "Learn the " + locked.name.toLowerCase() + " in Level " + locked.level : "Update the app to play"}</T></View>
        : <View style={s.inline}>{TIERS.map(t => <Stars key={t} stars={level.best[t]?.clears ? level.best[t]!.stars : null} />)}</View>}
    </View>
  </Pressable>;
}

function Stars({ stars }: { stars: number | null }) {
  const { theme } = usePreferences();
  return <View style={[s.tier, { backgroundColor: stars !== null ? theme.successSoft : theme.muted }]}>
    {[0, 1, 2].map(i => <Icon key={i} name="star" size={9} color={stars !== null && i < stars ? theme.warning : theme.border} />)}</View>;
}

/** The picked recipe's three tiers: Learn, Service and From memory, each opening after the one before. */
function Tiers({ game, pick, onPick }: { game: GameProgress; pick: KitchenPick; onPick(p: KitchenPick): void }) {
  const { theme } = usePreferences(), locked = missingTechnique(game, pick.level.techniques), practice = !useMember().member;
  return <Section title={pick.level.name}>
    {TIERS.map(t => { const open = !locked && tierOpen(pick.level, t, practice), best = pick.level.best[t];
      return <Pressable key={t} disabled={!open} onPress={() => onPick({ level: pick.level, tier: t })} accessibilityRole="radio"
        accessibilityState={{ selected: pick.tier === t, disabled: !open }} accessibilityLabel={TIER_NAMES[t] + (best?.clears ? ", " + best.stars + " stars" : open ? ", open" : ", locked")}
        style={({ pressed }) => [s.row, { borderColor: pick.tier === t && open ? theme.accent : theme.transparent, opacity: open ? (pressed ? 0.85 : 1) : 0.55 }]}>
        <View style={{ flex: 1 }}><T style={{ fontWeight: "800" }}>{TIER_NAMES[t]}</T></View>
        {open ? <Stars stars={best?.clears ? best.stars : null} /> : <Icon name="lock-closed" size={16} color={theme.mutedForeground} />}
      </Pressable>; })}
  </Section>;
}
/** The sheet footer for the Recipe Kitchen tab: start the picked tier when it is open. */
export function KitchenStart({ game, pick, onPlay }: { game: GameProgress; pick: KitchenPick | null; onPlay(hash: string, tier: Tier): void }) {
  const practice = !useMember().member;
  if (!pick || missingTechnique(game, pick.level.techniques) || !tierOpen(pick.level, pick.tier, practice)) return null;
  return <Button label={"Start " + TIER_NAMES[pick.tier]} onPress={() => onPlay(pick.level.hash, pick.tier)} />;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, borderWidth: 2 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  tier: { flexDirection: "row", gap: 1, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10 },
  blank: { alignItems: "center", justifyContent: "center" },
});
