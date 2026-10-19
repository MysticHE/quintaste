import { StyleSheet, View } from "react-native";
import { Chip } from "../../../components/food/Controls";
import { Button, T } from "../../../components/ui";
import { gamePreviewTools } from "../../../config/game";
import { DISHES } from "../../../game/content/dishes";
import { PETS, TIERS, type Tier } from "../../../game/content/cosmetics";
import { LEVELS } from "../../../game/content/levels";
import { cleared, type GameProgress } from "../../../game/progress";
import { RULES } from "../../../game/content/guests";
import { todaysSpecial } from "../../../game/special";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Art, Grid, Seg, Tile } from "./bits";

const learnedDishes = (g: GameProgress) => [...new Set(LEVELS.filter(l => cleared(g, l.n)).flatMap(l => l.orders.map(o => o.dish)).filter(d => d !== "*"))];

/** Chalkboard menu: Today's special, the dishes learned so far and the signature menu for Level 20. */
export function MenuSheet({ game, onClose, onSignature, onSpecial }: { game: GameProgress; onClose(): void; onSignature(ids: string[]): void; onSpecial(day: string): void }) {
  const { theme } = usePreferences();
  if (!cleared(game, 5)) return <GameSheet title="Chalkboard" onClose={onClose}><Section title="Opens at Level 6">
    <T muted>Clear the first lunch rush and the chalkboard becomes your menu: every dish you have learned, and your signature menu for Level 20.</T></Section></GameSheet>;
  const dishes = learnedDishes(game), sig = game.signature;
  const toggle = (id: string) => onSignature(sig.includes(id) ? sig.filter(x => x !== id) : sig.length < 3 ? [...sig, id] : sig);
  const special = todaysSpecial(game);
  return <GameSheet title="Your menu" onClose={onClose}>
    {special && <Section><View style={s.special}>
      <Art k={DISHES[special.dish].art} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="small" muted style={{ fontWeight: "800" }}>Today&apos;s special</T>
        <T style={{ fontWeight: "800" }}>{DISHES[special.dish].name}</T>
        {special.lunar && <T variant="small" color={theme.accent} style={{ fontWeight: "700" }}>{special.lunar} · {RULES.five.chip}</T>}
      </View>
      <Chip compact selected icon="play" label="Cook" a11y={"Cook today's special, " + DISHES[special.dish].name} onPress={() => onSpecial(special.day)} />
    </View></Section>}
    <T muted>Pick three dishes for your signature service (Level 20). Your regulars order from them.</T>
    <Grid>{dishes.map(id => <Tile key={id} art={DISHES[id].art} label={DISHES[id].name} selected={sig.includes(id)} worn={sig.includes(id)}
      status={sig.includes(id) ? "Signature" : sig.length < 3 ? "Add" : undefined} onPress={() => toggle(id)} />)}</Grid>
    <T variant="small" muted>{sig.length}/3 chosen. Each regular orders a signature dish that fits their rules; anyone who can&apos;t eat any of them gets ABC soup. The menu never changes on a timer.</T>
  </GameSheet>;
}

/** Lian and the wardrobe. The member's own avatar arrives with the Lotus Avatar flow. */
export function AvatarSheet({ onClose, onCompanion }: { onClose(): void; onCompanion(): void }) {
  return <GameSheet title="Lian" onClose={onClose}>
    <View style={s.center}><Art k="avatar-lian" size={180} /></View>
    <Section title="Peach apron · wearing"><T muted>Lian, the QuinTaste mascot, runs every new café. Your own Adult and Mini style avatar arrives with the Lotus Avatar flow, and outfits come with the wardrobe set.</T></Section>
    <Button variant="secondary" label="Style your companion" onPress={onCompanion} />
  </GameSheet>;
}

export function LotusSheet({ game, onClose, onTier }: { game: GameProgress; onClose(): void; onTier(t: Tier | null): void }) {
  const t = game.tier;
  return <GameSheet title="Your lotus" onClose={onClose}>
    <View style={s.center}><Art k={t ? "lotus-" + t : "lotus-bud-pink"} size={120} /></View>
    <Section title={t ? t[0].toUpperCase() + t.slice(1) + " lotus" : "Not bloomed yet"}>
      <T muted>{t ? (t === "pink" ? "Your avatar in Adult and Mini style." : "Your avatar, plus " + PETS[t].name + " and its accessory.") : "The Lotus Avatar flow lets you bloom a free lotus, see your tier, then breed your own avatar. It arrives in a later update."}</T>
    </Section>
    {gamePreviewTools && <Section title="Development preview">
      <T variant="small" muted>Development builds only: preview a lotus tier to test companions and skins.</T>
      <Seg label="Preview lotus tier" value={(t ?? "none") as Tier | "none"} onChange={v => onTier(v === "none" ? null : v)}
        options={[["none", "None"], ...TIERS.map(x => [x, x[0].toUpperCase() + x.slice(1)] as [Tier, string])]} />
    </Section>}
  </GameSheet>;
}

export function LaterSheet({ title, text, onClose }: { title: string; text: string; onClose(): void }) {
  return <GameSheet title={title} onClose={onClose}><Section title="Coming in a later update"><T muted>{text}</T></Section></GameSheet>;
}
const s = StyleSheet.create({ center: { alignItems: "center" }, special: { flexDirection: "row", alignItems: "center", gap: 12 } });
