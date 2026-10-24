import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, T } from "../../../components/ui";
import { GAME_ART } from "../../../game/art";
import { ACCESSORIES, ACCESSORY_ORDER, PETS, PET_ORDER, SKILLS, wearArt } from "../../../game/content/cosmetics";
import { isUnlocked, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Grid, Seg, Tile, useUnlockText } from "./bits";
import { useT } from "../../../i18n";

/** Companion: choose, style with fitted accessories, and read the Rush Hour skill (boards A06, A07). */
export function CompanionSheet({ game, onClose, onChoose, onWear }: { game: GameProgress; onClose(): void; onChoose(pet: string): void; onWear(pet: string, acc: string | null): void }) {
  const { theme } = usePreferences(), t = useT("game"), unlockText = useUnlockText();
  const [tab, setTab] = useState<"style" | "skill" | "choose">("style");
  const [pick, setPick] = useState(game.pet);
  const pet = PETS[tab === "choose" ? pick : game.pet], worn = game.equip[game.pet] ?? null;
  const [style, setStyle] = useState<string | null>(worn);
  const fits = (acc: string) => acc !== PETS[game.pet].builtIn && !!GAME_ART[wearArt(game.pet, acc)];
  const heroKey = tab === "style" ? wearArt(game.pet, style) : tab === "choose" ? wearArt(pick, game.equip[pick] ?? null) : wearArt(game.pet, worn);
  const hero = GAME_ART[heroKey] ?? GAME_ART[pet.art];
  const petOk = (id: string) => isUnlocked(game, PETS[id].unlock);
  const accOk = (id: string) => isUnlocked(game, ACCESSORIES[id].unlock);
  const footer = tab === "choose"
    ? pick === game.pet ? <Button label={t("petWithYou", { pet: PETS[pick].name })} disabled onPress={() => {}} />
      : petOk(pick) ? <Button label={t("choosePet", { pet: PETS[pick].name })} onPress={() => onChoose(pick)} /> : <Button label={t("petUnlock", { pet: PETS[pick].name, unlock: unlockText(PETS[pick].unlock) })} disabled onPress={() => {}} />
    : tab === "style" ? style === worn ? <Button label={style ? t("wearingThe", { item: ACCESSORIES[style].name.toLowerCase() }) : t("wearingNothing")} disabled onPress={() => {}} />
      : !style || accOk(style) ? <Button label={style ? t("wearThe", { item: ACCESSORIES[style].name.toLowerCase() }) : t("takeOff")} onPress={() => onWear(game.pet, style)} />
      : <Button label={unlockText(ACCESSORIES[style].unlock)} disabled onPress={() => {}} /> : undefined;
  return <GameSheet title={tab === "choose" ? t("companion") : pet.name} subtitle={t("skillSubtitle", { skill: SKILLS[pet.skill].name })} onClose={onClose} footer={footer}>
    <View style={[s.hero, { backgroundColor: theme.accentSoft }]}>
      {hero && <Image source={hero} style={s.heroImg} resizeMode="contain" accessibilityLabel={pet.name} />}
    </View>
    <Seg label={t("companion")} value={tab} onChange={next => { setTab(next); setStyle(worn); }} options={[["style", t("tabStyle")], ["skill", t("tabSkill")], ["choose", t("tabChoose")]]} />
    {tab === "choose" && <><Grid>{PET_ORDER.map(id => <Tile key={id} art={PETS[id].art} label={PETS[id].name} selected={pick === id} worn={game.pet === id} locked={!petOk(id)}
      status={petOk(id) ? SKILLS[PETS[id].skill].name : unlockText(PETS[id].unlock)} onPress={() => setPick(id)} />)}</Grid>
      <T variant="small" muted style={{ textAlign: "center" }}>{t("switchAnytime")}</T></>}
    {tab === "style" && <><Grid>
      <Tile label={t("none")} status={!worn ? t("wearing") : undefined} selected={style === null} worn={!worn} onPress={() => setStyle(null)} />
      {ACCESSORY_ORDER.filter(fits).map(id => <Tile key={id} art={ACCESSORIES[id].art} label={ACCESSORIES[id].name} selected={style === id} worn={worn === id}
        locked={!accOk(id)} status={accOk(id) ? (worn === id ? t("wearing") : t("inCollection")) : unlockText(ACCESSORIES[id].unlock)} onPress={() => setStyle(id)} />)}
    </Grid><T variant="small" muted style={{ textAlign: "center" }}>{t("noDailyCare")}</T></>}
    {tab === "skill" && <Section title={SKILLS[pet.skill].name}><T>{SKILLS[pet.skill].effect}</T><T variant="small" muted>{SKILLS[pet.skill].best}</T>
      <T variant="small" muted>{t("skillNote")}</T></Section>}
  </GameSheet>;
}
const s = StyleSheet.create({
  hero: { height: 200, borderRadius: 22, alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 },
  heroImg: { width: 180, height: 180 },
});
