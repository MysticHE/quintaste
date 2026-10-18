import { useState } from "react";
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../../game/art";
import { DECOR, PETS, SKINS, wearArt } from "../../../game/content/cosmetics";
import { cleared, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { useKeyboardFocus } from "../../../hooks/useKeyboardFocus";
import { Icon } from "../../../components/ui";
import { AVATAR, BACK, COUNTER, PET, SLOTS, STATIONS_ON_COUNTER, STOVE, WOK, HINTS, slotBox, type Box, type SlotId } from "./sceneLayout";
import { Glint, Hop, Motes, PressGlow, Sparkle, Steam, Sway } from "./Ambient";

export type HotId = "books" | "menu" | "window" | "wardrobe" | "stove" | "avatar" | "pet";
const art = (key: string): ImageSourcePropType | undefined => GAME_ART[key];
const ratio = (key: string) => { const size = GAME_ART_SIZE[key]; return size ? size[1] / size[0] : 1; };
export const sceneSkin = (game: GameProgress) => (SKINS[game.skin]?.art && art(SKINS[game.skin].art!) ? game.skin : "sunny");
/** The wide (3:2) version of a skin for wider screens, when QT Gamer has made one (style.json homeSkin). */
export const wideSkinKey = (skin: string) => { const k = SKINS[skin]?.art + "-wide"; return GAME_ART[k] && GAME_ART_SIZE[k] ? k : null; };

type Props = {
  game: GameProgress; width: number; decor: Record<string, string | null>; decorating: boolean; selectedSlot: SlotId | null;
  hint: boolean; onHot(id: HotId): void; onSlot(id: SlotId): void;
  /** False when Stage already shows the wide skin, whose middle is this room blended at the seams: drawing it again would bring back hard edges. */
  backdrop?: boolean;
};
/** The café room: backdrop, decor, the cook behind the counter, the companion, ambient motion and invisible hotspots. */
export function Scene({ game, width, decor, decorating, selectedSlot, hint, onHot, onSlot, backdrop = true }: Props) {
  const u = width / 100, skin = sceneSkin(game);
  const px = (b: Box) => ({ left: b[0] * u, top: b[1] * u, width: b[2] * u, height: b[3] * u });
  const bottomAt = (key: string, x: number, w: number, bottom: number) => { const h = w * ratio(key); return { left: x * u, top: (bottom - h) * u, width: w * u, height: h * u }; };
  const petKey = (() => { const k = wearArt(game.pet, game.equip[game.pet] ?? null); return art(k) ? k : PETS[game.pet].art; })();
  const petW = PET.w * (PETS[game.pet].scale ?? 1), menuOpen = cleared(game, 5);
  const hots: { id: HotId; box: Box; name: string; core?: boolean }[] = [
    { id: "window", box: BACK.window[skin], name: "Window: stall visits, coming in a later update" },
    { id: "books", box: BACK.books[skin], name: "Bookshelf: recipe, pantry and regulars books", core: true },
    { id: "menu", box: BACK.menu[skin], name: menuOpen ? "Chalkboard menu" : "Chalkboard menu, opens at Level 6" },
    { id: "wardrobe", box: BACK.wardrobe[skin], name: "Mirror and aprons: wardrobe", core: true },
    { id: "avatar", box: [AVATAR.cx - AVATAR.w / 2, 66, AVATAR.w, 32], name: "Lian, the QuinTaste mascot, cooking" },
    { id: "stove", box: STOVE, name: "Stove: play Rush Hour", core: true },
    { id: "pet", box: [PET.x, PET.bottom - petW * ratio(petKey), petW, petW * ratio(petKey)], name: "Your companion, " + PETS[game.pet].name, core: true },
  ];
  const decorImg = (slot: SlotId) => {
    const id = decor[slot]; if (!id || !DECOR[id]) return null;
    const d = DECOR[id], [x, y, w, h] = slotBox(slot, skin); let iw = w, ih = w * ratio(d.art);
    if (ih > h) { ih = h; iw = h / ratio(d.art); }
    const anchor = SLOTS[slot].anchor, top = anchor === "top" ? y : anchor === "bottom" ? y + h - ih : y + (h - ih) / 2;
    const box = { left: (x + (w - iw) / 2) * u, top: top * u, width: iw * u, height: ih * u };
    const img = <Image source={art(d.art)} resizeMode="contain" accessibilityIgnoresInvertColors style={s.fill} />;
    if (anchor === "center") return <View key={slot} style={[s.abs, box]}>{img}</View>;
    return <Sway key={slot} style={[s.abs, box]} deg={anchor === "top" ? 1.8 : 1.1} origin={anchor === "top" ? "top" : "bottom"} duration={anchor === "top" ? 3800 : 3000} delay={slot === "floorR" ? 700 : 0}>{img}</Sway>;
  };
  return <View style={{ width, height: width * 1.5 }} accessibilityLabel={"My café, " + game.cafeName}>
    {backdrop && <Image source={art(SKINS[skin].art!)} style={[s.abs, { left: 0, top: 0, width, height: width * 1.5 }]} resizeMode="cover" />}
    <Glint box={BACK.window[skin]} u={u} />
    {decorImg("ceiling")}{decorImg("wall")}
    <Sway style={[s.abs, bottomAt("avatar-lian", AVATAR.cx - AVATAR.w / 2, AVATAR.w, AVATAR.bottom)]} deg={0.9} origin="bottom" duration={1900}>
      <Image source={art("avatar-lian")} style={s.fill} resizeMode="contain" />
    </Sway>
    <Image source={art("cafe-counter")} style={[s.abs, bottomAt("cafe-counter", COUNTER.x, COUNTER.w, COUNTER.y + COUNTER.w * ratio("cafe-counter"))]} resizeMode="contain" />
    {STATIONS_ON_COUNTER.filter(st => cleared(game, st.level)).map(st =>
      <Image key={st.id} source={art(st.art)} style={[s.abs, bottomAt(st.art, st.x, st.w, st.bottom)]} resizeMode="contain" accessibilityLabel={st.name} />)}
    <Steam x={WOK.x} y={WOK.y} u={u} />
    <Hop style={[s.abs, bottomAt(petKey, PET.x, petW, PET.bottom)]} u={u}>
      <Image source={art(petKey)} style={s.fill} resizeMode="contain" />
    </Hop>
    {decorImg("floorL")}{decorImg("floorR")}
    <Motes u={u} />
    {!decorating && hots.map(h => <HotSpot key={h.id} name={h.name} box={px(h.box)} onPress={() => onHot(h.id)} />)}
    {!decorating && hint && [...Object.values(HINTS), [PET.x + petW * 0.85, PET.bottom - petW * ratio(petKey) + 2]].map(([x, y]) => <Sparkle key={x + ":" + y} left={x * u} top={y * u} size={Math.max(18, 4.6 * u)} />)}
    {decorating && (Object.keys(SLOTS) as SlotId[]).map(id => <DecorSlot key={id} id={id} box={px(slotBox(id, skin))} item={decor[id]} selected={selectedSlot === id} onPress={() => onSlot(id)} />)}
  </View>;
}

/** An invisible hotspot: no outline or label at rest; it glows under the finger and shows a ring for keyboard focus. */
function HotSpot({ name, box, onPress }: { name: string; box: { left: number; top: number; width: number; height: number }; onPress(): void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), p = useSharedValue(0);
  return <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} {...focusProps}
    onPressIn={() => { p.value = withTiming(1, { duration: 140 }); }} onPressOut={() => { p.value = withTiming(0, { duration: 420 }); }}
    style={[s.abs, s.hot, box, { borderColor: focused ? theme.mediaRating : theme.transparent }]}>
    <PressGlow p={p} w={box.width} h={box.height} />
  </Pressable>;
}

/** Decorate mode: an empty spot is a dashed outline with a plus; the chosen spot has an accent outline. */
function DecorSlot({ id, box, item, selected, onPress }: { id: SlotId; box: object; item: string | null | undefined; selected: boolean; onPress(): void }) {
  const { theme } = usePreferences(), [hover, setHover] = useState(false);
  const name = SLOTS[id].name + ": " + (item ? DECOR[item].name : "empty");
  return <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected }} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
    style={[s.abs, s.slot, box, { borderStyle: item && !selected ? "solid" : "dashed", borderColor: selected ? theme.accent : item && !hover ? theme.transparent : theme.mediaForeground,
      backgroundColor: item ? theme.transparent : theme.mediaDivider }, selected && { borderWidth: 3, borderStyle: "solid" }]}>
    {!item && <View style={[s.plus, { backgroundColor: selected ? theme.accent : theme.mediaControl }]}><Icon name="add" size={20} color={theme.mediaForeground} /></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
  hot: { borderRadius: 16, borderWidth: 2, minWidth: 44, minHeight: 44, overflow: "hidden" },
  slot: { borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
