import { useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Field, Icon, T } from "../../../components/ui";
import { GAME_ART } from "../../../game/art";
import { DECOR, DECOR_ORDER, SKINS, SKIN_ORDER } from "../../../game/content/cosmetics";
import { isUnlocked, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Grid, Tile, useUnlockText } from "./bits";
import { useT } from "../../../i18n";
import { OpenMyCafe } from "./Cafes";

/** Café details (board A10): private name, skins, and decor bought with earned credits (never money, QT-056). */
export function CafeSheet({ game, onClose, onName, onSkin, onBuy, onDecorate }: {
  game: GameProgress; onClose(): void; onName(n: string): void; onSkin(id: string): void; onBuy(id: string): void; onDecorate(): void;
}) {
  const { theme } = usePreferences(), t = useT("game"), unlockText = useUnlockText();
  const [name, setName] = useState(game.cafeName);
  function buy(id: string) {
    const d = DECOR[id]; if (d.unlock.kind !== "credits") return;
    const price = d.unlock.price, ok = () => onBuy(id);
    if (game.credits < price) return;
    if (Platform.OS === "web") { if (globalThis.confirm?.(t("buyConfirm", { item: d.name, price }))) ok(); return; }
    Alert.alert(t("buyTitle", { item: d.name }), t("buyBody", { price, have: game.credits }), [{ text: t("notNow"), style: "cancel" }, { text: t("buy"), onPress: ok }]);
  }
  return <GameSheet title={t("cafeDetails")} subtitle={t("cafeSubtitle", { name: game.cafeName, n: game.credits })} art="decor-plant" onClose={onClose}>
    <Field label={t("cafeName")} value={name} maxLength={18} onChangeText={setName} onBlur={() => onName(name)} onSubmitEditing={() => onName(name)} />
    <T variant="small" muted>{t("cafeNameNote")}</T>
    <Section title={t("skin")}><View style={s.skins}>{SKIN_ORDER.map(id => {
      const sk = SKINS[id], ok = isUnlocked(game, sk.unlock), src = sk.art ? GAME_ART[sk.art] : undefined;
      return <Pressable key={id} disabled={!ok || !src} onPress={() => onSkin(id)} accessibilityRole="button" accessibilityState={{ selected: game.skin === id, disabled: !ok }}
        accessibilityLabel={sk.name + (game.skin === id ? t("inUseSuffix") : ok ? "" : t("sep") + unlockText(sk.unlock))}
        style={[s.skin, { borderColor: game.skin === id ? theme.accent : theme.border, backgroundColor: theme.card }]}>
        <View style={[s.thumb, { backgroundColor: theme.muted }]}>
          {src && <Image source={src} style={[StyleSheet.absoluteFill, !ok && { opacity: 0.35 }]} resizeMode="cover" />}
          {!ok && <View style={[s.lock, { backgroundColor: theme.mediaControl }]}><Icon name="lock-closed" size={14} color={theme.mediaForeground} /></View>}
        </View>
        <T variant="small" style={{ fontWeight: "800" }} numberOfLines={1}>{sk.name}</T>
        <T variant="small" muted style={{ fontSize: 11 }}>{game.skin === id ? t("inUse") : ok ? t("earned") : unlockText(sk.unlock)}</T>
      </Pressable>;
    })}</View></Section>
    <Section title={t("decorCredits", { n: game.credits })}>
      <T variant="small" muted>{t("creditsNote")}</T>
      <Grid>{DECOR_ORDER.map(id => {
        const d = DECOR[id], ok = isUnlocked(game, d.unlock, id), price = d.unlock.kind === "credits" ? d.unlock.price : 0;
        const status = ok ? t("owned") : d.unlock.kind === "credits" ? t("credits", { n: price }) + (game.credits < price ? t("needMore", { n: price - game.credits }) : "") : unlockText(d.unlock);
        return <Tile key={id} art={d.art} label={d.name} status={status} locked={!ok} worn={ok}
          onPress={() => { if (!ok && d.unlock.kind === "credits") buy(id); }} a11y={d.name + t("sep") + status + (!ok && d.unlock.kind === "credits" && game.credits >= price ? t("buySuffix") : "")} />;
      })}</Grid>
      <Button label={t("arrangeDecor")} icon="color-palette-outline" variant="secondary" onPress={onDecorate} />
    </Section>
    <OpenMyCafe game={game} />
  </GameSheet>;
}
const s = StyleSheet.create({
  skins: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skin: { width: "30%", flexGrow: 1, borderRadius: 18, borderWidth: 2, overflow: "hidden", paddingBottom: 8, alignItems: "center", gap: 2 },
  // A fixed height: an Image with aspectRatio inside a percentage-width tile stretches to the art's own height on Android.
  thumb: { width: "100%", height: 104, overflow: "hidden", marginBottom: 4 },
  lock: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
