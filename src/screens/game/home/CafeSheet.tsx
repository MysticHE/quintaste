import { useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Field, Icon, T } from "../../../components/ui";
import { GAME_ART } from "../../../game/art";
import { DECOR, DECOR_ORDER, SKINS, SKIN_ORDER, unlockText } from "../../../game/content/cosmetics";
import { isUnlocked, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Grid, Tile } from "./bits";

/** Café details (board A10): private name, skins, and decor bought with earned credits (never money, QT-056). */
export function CafeSheet({ game, onClose, onName, onSkin, onBuy, onDecorate }: {
  game: GameProgress; onClose(): void; onName(n: string): void; onSkin(id: string): void; onBuy(id: string): void; onDecorate(): void;
}) {
  const { theme } = usePreferences();
  const [name, setName] = useState(game.cafeName);
  function buy(id: string) {
    const d = DECOR[id]; if (d.unlock.kind !== "credits") return;
    const price = d.unlock.price, ok = () => onBuy(id);
    if (game.credits < price) return;
    if (Platform.OS === "web") { if (globalThis.confirm?.("Buy " + d.name + " for " + price + " credits?")) ok(); return; }
    Alert.alert("Buy " + d.name + "?", price + " café credits. You have " + game.credits + ".", [{ text: "Not now", style: "cancel" }, { text: "Buy", onPress: ok }]);
  }
  return <GameSheet title="Café details" subtitle={game.cafeName + " · " + game.credits + " credits"} art="decor-plant" onClose={onClose}>
    <Field label="Café name" value={name} maxLength={18} onChangeText={setName} onBlur={() => onName(name)} onSubmitEditing={() => onName(name)} />
    <T variant="small" muted>It goes on your café sign. Only you can see your café.</T>
    <Section title="Skin"><View style={s.skins}>{SKIN_ORDER.map(id => {
      const sk = SKINS[id], ok = isUnlocked(game, sk.unlock), src = sk.art ? GAME_ART[sk.art] : undefined;
      return <Pressable key={id} disabled={!ok || !src} onPress={() => onSkin(id)} accessibilityRole="button" accessibilityState={{ selected: game.skin === id, disabled: !ok }}
        accessibilityLabel={sk.name + (game.skin === id ? ", in use" : ok ? "" : ", " + unlockText(sk.unlock))}
        style={[s.skin, { borderColor: game.skin === id ? theme.accent : theme.border, backgroundColor: theme.card }]}>
        <View style={[s.thumb, { backgroundColor: theme.muted }]}>
          {src && <Image source={src} style={[StyleSheet.absoluteFill, !ok && { opacity: 0.35 }]} resizeMode="cover" />}
          {!ok && <View style={[s.lock, { backgroundColor: theme.mediaControl }]}><Icon name="lock-closed" size={14} color={theme.mediaForeground} /></View>}
        </View>
        <T variant="small" style={{ fontWeight: "800" }} numberOfLines={1}>{sk.name}</T>
        <T variant="small" muted style={{ fontSize: 11 }}>{game.skin === id ? "In use" : ok ? "Earned" : unlockText(sk.unlock)}</T>
      </Pressable>;
    })}</View></Section>
    <Section title={"Decor · " + game.credits + " credits"}>
      <T variant="small" muted>Credits come from clearing levels. They can&apos;t be bought.</T>
      <Grid>{DECOR_ORDER.map(id => {
        const d = DECOR[id], ok = isUnlocked(game, d.unlock, id), price = d.unlock.kind === "credits" ? d.unlock.price : 0;
        const status = ok ? "Owned" : d.unlock.kind === "credits" ? price + " credits" + (game.credits < price ? " · need " + (price - game.credits) + " more" : "") : unlockText(d.unlock);
        return <Tile key={id} art={d.art} label={d.name} status={status} locked={!ok} worn={ok}
          onPress={() => { if (!ok && d.unlock.kind === "credits") buy(id); }} a11y={d.name + ", " + status + (!ok && d.unlock.kind === "credits" && game.credits >= price ? ". Buy" : "")} />;
      })}</Grid>
      <Button label="Arrange decor" icon="color-palette-outline" variant="secondary" onPress={onDecorate} />
    </Section>
  </GameSheet>;
}
const s = StyleSheet.create({
  skins: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skin: { width: "30%", flexGrow: 1, borderRadius: 18, borderWidth: 2, overflow: "hidden", paddingBottom: 8, alignItems: "center", gap: 2 },
  // A fixed height: an Image with aspectRatio inside a percentage-width tile stretches to the art's own height on Android.
  thumb: { width: "100%", height: 104, overflow: "hidden", marginBottom: 4 },
  lock: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
