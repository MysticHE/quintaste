import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Chip } from "../../../components/food/Controls";
import { Button, T } from "../../../components/ui";
import { DISHES } from "../../../game/content/dishes";
import { PETS, type Tier } from "../../../game/content/cosmetics";
import { LEVELS, MAX_STATIONS } from "../../../game/content/levels";
import { signatureStations } from "../../../game/sim/engine";
import { cleared, type GameProgress } from "../../../game/progress";
import { RULES } from "../../../game/content/guests";
import { todaysSpecial } from "../../../game/special";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Art, Grid, LOTUS_TIER_KEYS, Tile } from "./bits";
import { useT } from "../../../i18n";

const learnedDishes = (g: GameProgress) => [...new Set(LEVELS.filter(l => cleared(g, l.n)).flatMap(l => l.orders.map(o => o.dish)).filter(d => d !== "*"))];

/** Chalkboard menu: Today's special, the dishes learned so far and the signature menu for Level 20. */
export function MenuSheet({ game, onClose, onSignature, onSpecial }: { game: GameProgress; onClose(): void; onSignature(ids: string[]): void; onSpecial(day: string): void }) {
  const { theme } = usePreferences(), t = useT("game");
  if (!cleared(game, 5)) return <GameSheet title={t("chalkboard")} onClose={onClose}><Section title={t("opensAtLevel6")}>
    <T muted>{t("chalkboardLocked")}</T></Section></GameSheet>;
  // A dish is added only while the three still fit the four stations a service uses.
  const dishes = learnedDishes(game), sig = game.signature, sigLevel = LEVELS.find(l => l.signature);
  const canAdd = (id: string) => sig.length < 3 && (!sigLevel || signatureStations(sigLevel, [...sig, id]).length <= MAX_STATIONS);
  const toggle = (id: string) => onSignature(sig.includes(id) ? sig.filter(x => x !== id) : canAdd(id) ? [...sig, id] : sig);
  const special = todaysSpecial(game);
  return <GameSheet title={t("yourMenu")} subtitle={t("signatureCount", { n: sig.length })} onClose={onClose}>
    {special && <Section><View style={s.special}>
      <Art k={DISHES[special.dish].art} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="small" muted style={{ fontWeight: "800" }}>{t("todaysSpecial")}</T>
        <T style={{ fontWeight: "800" }}>{DISHES[special.dish].name}</T>
        {special.lunar && <T variant="small" color={theme.accent} style={{ fontWeight: "700" }}>{special.lunar} · {RULES.five.chip}</T>}
      </View>
      <Chip compact selected icon="play" label={t("cook")} a11y={t("cookSpecial", { dish: DISHES[special.dish].name })} onPress={() => onSpecial(special.day)} />
    </View></Section>}
    <T muted>{t("pickThree")}</T>
    <Grid>{dishes.map(id => <Tile key={id} art={DISHES[id].art} label={DISHES[id].name} selected={sig.includes(id)} worn={sig.includes(id)}
      status={sig.includes(id) ? t("signature") : canAdd(id) ? t("add") : undefined} onPress={() => toggle(id)} />)}</Grid>
    <T variant="small" muted>{t("signatureNote", { n: sig.length })}</T>
  </GameSheet>;
}

/** Lian and the wardrobe. The member's own avatar arrives with the Lotus Avatar flow. */
export function AvatarSheet({ onClose, onCompanion }: { onClose(): void; onCompanion(): void }) {
  const t = useT("game");
  return <GameSheet title="Lian" subtitle={t("mascot")} onClose={onClose}>
    <View style={s.center}><Art k="avatar-lian" size={180} /></View>
    <Section title={t("peachApron")}><T muted>{t("lianNote")}</T></Section>
    <Button variant="secondary" label={t("styleCompanion")} onPress={onCompanion} />
  </GameSheet>;
}

/** The member's lotus from their account. Blooming happens on the lotus screen, where the odds are shown. */
export function LotusSheet({ tier, member, onClose }: { tier: Tier | null; member: boolean; onClose(): void }) {
  const t = useT("game"), tc = useT("common");
  const name = tier ? t("tierLotus", { tier: t(LOTUS_TIER_KEYS[tier]) }) : t("notBloomed");
  const open = () => { onClose(); router.push(member ? "/lotus" : { pathname: "/login", params: { returnTo: "/lotus" } }); };
  return <GameSheet title={t("yourLotus")} onClose={onClose}>
    <View style={s.center}><Art k={tier ? "lotus-" + tier : "lotus-bud-pink"} size={120} /></View>
    <Section title={name}>
      <T muted>{tier ? (tier === "pink" ? t("avatarStyles") : t("avatarPlus", { pet: PETS[tier].name }))
        : member ? t("bloomToFind") : t("signInToBloom")}</T>
    </Section>
    <Button variant={tier ? "secondary" : "primary"} label={tier ? t("openYourLotus") : member ? t("bloomYourLotus") : tc("signIn")} onPress={open} />
  </GameSheet>;
}

export function LaterSheet({ title, text, onClose }: { title: string; text: string; onClose(): void }) {
  const t = useT("game");
  return <GameSheet title={title} onClose={onClose}><Section title={t("comingLater")}><T muted>{text}</T></Section></GameSheet>;
}
const s = StyleSheet.create({ center: { alignItems: "center" }, special: { flexDirection: "row", alignItems: "center", gap: 12 } });
