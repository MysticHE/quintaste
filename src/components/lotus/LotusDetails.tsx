import { Image, StyleSheet, View } from "react-native";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import type { Tier } from "../../game/content/cosmetics";
import { perksFor, type LotusPerk } from "../../game/content/lotus";
import type { LotusState } from "../../services/lotus-api";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";
import { lotusArt } from "./LotusSeal";
import { LOTUS_TIER_KEYS } from "../../screens/game/home/bits";
import { useT } from "../../i18n";

function Art({ k, size, frosted }: { k: string; size: number; frosted?: boolean }) {
  const [w, h] = GAME_ART_SIZE[k], scale = size / Math.max(w, h);
  return <Image source={GAME_ART[k]} resizeMode="contain" accessible={false} blurRadius={frosted ? 3 : 0}
    style={{ width: w * scale, height: h * scale, opacity: frosted ? 0.6 : 1 }} />;
}

/** The published odds, exactly as the server rolls them. */
export function OddsList({ odds }: { odds: LotusState["odds"] }) {
  const { theme } = usePreferences(), t = useT("game");
  return <View testID="lotus-odds" accessibilityLabel={t("lotusOddsA11y", { list: odds.map(o => t(LOTUS_TIER_KEYS[o.tier]) + " " + o.percent + "%").join(t("sep")) })} accessible>
    {odds.map((o, i) => <View key={o.tier} style={[common.spread, s.odd, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.divider }]}>
      <View style={common.row}><Art k={lotusArt(o.tier)} size={30} /><T>{t(LOTUS_TIER_KEYS[o.tier])}</T></View>
      <T style={common.bold}>{o.percent}%</T>
    </View>)}
  </View>;
}

/** A frame or aura preview: a frosted portrait with the tier's ring around it. */
function Ring({ perk, frosted }: { perk: LotusPerk; frosted: boolean }) {
  const { theme } = usePreferences(), colour = theme.lotus[perk.tier];
  return <View style={[s.ring, { borderColor: colour, borderWidth: perk.kind === "aura" ? 2 : 4 }]}>
    {perk.kind === "aura" && <View style={[s.aura, { borderColor: colour }]} />}
    <Art k="avatar-adult" size={46} frosted={frosted} />
    {perk.id === "sparkle-frame" && <View style={s.spark}><Icon name="sparkles" size={18} color={colour} /></View>}
  </View>;
}

/**
 * What the member's lotus brings. Companions and the café pond are theirs in Rush Hour now; frames and auras are frosted
 * previews until the member breeds their own avatar, then they are drawn on it.
 */
export function Perks({ tier, bred = false }: { tier: Tier; bred?: boolean }) {
  const { theme } = usePreferences(), perks = perksFor(tier), t = useT("game");
  if (!perks.length) return null;
  return <View style={s.grid}>
    {perks.map(perk => {
      const inCafe = perk.kind === "companion" || perk.kind === "decor", owned = inCafe || bred;
      return <View key={perk.id} testID={"lotus-perk-" + perk.id} style={[s.perk, { backgroundColor: theme.card, borderColor: theme.border }]}
        accessible accessibilityLabel={perk.name + (inCafe ? t("lotusInCafeNow") : bred ? t("lotusOnAvatarSuffix") : t("lotusArrivesSuffix"))}>
        <View style={[s.art, owned ? null : { backgroundColor: theme.lotus.frost }]}>
          {perk.art ? <Art k={perk.art} size={64} frosted={!owned} /> : <Ring perk={perk} frosted={!owned} />}
          {!owned && <View style={[s.lock, { backgroundColor: theme.card, borderColor: theme.border }]}><Icon name="lock-closed" size={12} color={theme.accent} /></View>}
        </View>
        <T variant="small" style={[common.bold, common.center]} numberOfLines={2}>{perk.name}</T>
        <T variant="small" muted style={common.center}>{inCafe ? t("lotusInCafe") : bred ? t("lotusOnAvatar") : t("lotusWithAvatar")}</T>
      </View>;
    })}
  </View>;
}

const s = StyleSheet.create({
  odd: { minHeight: 44, paddingVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  perk: { flexBasis: 140, flexGrow: 1, maxWidth: 220, borderWidth: 1, borderRadius: 16, padding: 10, gap: 4, alignItems: "center" },
  art: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  ring: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", overflow: "visible" },
  aura: { position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, opacity: 0.6 },
  spark: { position: "absolute", top: -6, right: -6 },
  lock: { position: "absolute", right: 2, bottom: 2, width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
