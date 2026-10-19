import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, T } from "../../../components/ui";
import { DISHES } from "../../../game/content/dishes";
import { PETS, type Tier } from "../../../game/content/cosmetics";
import { LEVELS } from "../../../game/content/levels";
import { cleared, type GameProgress } from "../../../game/progress";
import { GameSheet, Section } from "./GameSheet";
import { Art, Grid, Tile } from "./bits";

const learnedDishes = (g: GameProgress) => [...new Set(LEVELS.filter(l => cleared(g, l.n)).flatMap(l => l.orders.map(o => o.dish)).filter(d => d !== "*"))];

/** Chalkboard menu: the dishes learned so far and the signature menu for Level 20. */
export function MenuSheet({ game, onClose, onSignature }: { game: GameProgress; onClose(): void; onSignature(ids: string[]): void }) {
  if (!cleared(game, 5)) return <GameSheet title="Chalkboard" onClose={onClose}><Section title="Opens at Level 6">
    <T muted>Clear the first lunch rush and the chalkboard becomes your menu: every dish you have learned, and your signature menu for Level 20.</T></Section></GameSheet>;
  const dishes = learnedDishes(game), sig = game.signature;
  const toggle = (id: string) => onSignature(sig.includes(id) ? sig.filter(x => x !== id) : sig.length < 3 ? [...sig, id] : sig);
  return <GameSheet title="Your menu" subtitle={sig.length + " of 3 signature dishes"} onClose={onClose}>
    <T muted>Pick three dishes for your signature service (Level 20). Your regulars order from them.</T>
    <Grid>{dishes.map(id => <Tile key={id} art={DISHES[id].art} label={DISHES[id].name} selected={sig.includes(id)} worn={sig.includes(id)}
      status={sig.includes(id) ? "Signature" : sig.length < 3 ? "Add" : undefined} onPress={() => toggle(id)} />)}</Grid>
    <T variant="small" muted>{sig.length}/3 chosen. Each regular orders a signature dish that fits their rules; anyone who can&apos;t eat any of them gets ABC soup. The menu never changes on a timer.</T>
  </GameSheet>;
}

/** Lian and the wardrobe. The member's own avatar arrives with the Lotus Avatar flow. */
export function AvatarSheet({ onClose, onCompanion }: { onClose(): void; onCompanion(): void }) {
  return <GameSheet title="Lian" subtitle="The QuinTaste mascot" onClose={onClose}>
    <View style={s.center}><Art k="avatar-lian" size={180} /></View>
    <Section title="Peach apron · wearing"><T muted>Lian, the QuinTaste mascot, runs every new café. Your own Adult and Mini style avatar arrives with the Lotus Avatar flow, and outfits come with the wardrobe set.</T></Section>
    <Button variant="secondary" label="Style your companion" onPress={onCompanion} />
  </GameSheet>;
}

/** The member's lotus from their account. Blooming happens on the lotus screen, where the odds are shown. */
export function LotusSheet({ tier, member, onClose }: { tier: Tier | null; member: boolean; onClose(): void }) {
  const name = tier ? tier[0].toUpperCase() + tier.slice(1) + " lotus" : "Not bloomed yet";
  const open = () => { onClose(); router.push(member ? "/lotus" : { pathname: "/login", params: { returnTo: "/lotus" } }); };
  return <GameSheet title="Your lotus" onClose={onClose}>
    <View style={s.center}><Art k={tier ? "lotus-" + tier : "lotus-bud-pink"} size={120} /></View>
    <Section title={name}>
      <T muted>{tier ? (tier === "pink" ? "Your avatar in Adult and Mini style." : "Your avatar, plus " + PETS[tier].name + " and its accessory, here in your café.")
        : member ? "Bloom your free lotus to find your tier." : "Sign in to bloom your free lotus."}</T>
    </Section>
    <Button variant={tier ? "secondary" : "primary"} label={tier ? "Open Your Lotus" : member ? "Bloom Your Lotus" : "Sign In"} onPress={open} />
  </GameSheet>;
}

export function LaterSheet({ title, text, onClose }: { title: string; text: string; onClose(): void }) {
  return <GameSheet title={title} onClose={onClose}><Section title="Coming in a later update"><T muted>{text}</T></Section></GameSheet>;
}
const s = StyleSheet.create({ center: { alignItems: "center" } });
