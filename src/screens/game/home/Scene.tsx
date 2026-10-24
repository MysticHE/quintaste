import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { Easing, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../../game/art";
import { DECOR, PETS, SKINS, wearArt } from "../../../game/content/cosmetics";
import { cleared, type GameProgress } from "../../../game/progress";
import { usePreferences } from "../../../state/Preferences";
import { useKeyboardFocus } from "../../../hooks/useKeyboardFocus";
import { Icon } from "../../../components/ui";
import { AVATAR, backBox, COUNTER, PET, SLOTS, STATIONS_ON_COUNTER, STOVE, WOK, SPARKLE_AT, slotBox, type Box, type SlotId } from "./sceneLayout";
import { Glint, Hop, HoverGlow, Motes, PressGlow, Steam, Sway } from "./Ambient";
import { HeartPop, Leaves, RevealGlow, SparkleCycle, SunRays, popOnce } from "./SceneFx";
import { useT } from "../../../i18n";

export type HotId = "books" | "menu" | "window" | "wardrobe" | "stove" | "avatar" | "pet";
const art = (key: string): ImageSourcePropType | undefined => GAME_ART[key];
/** Height over width of a game art image (1 when its size is unknown). */
export const artRatio = (key: string) => { const size = GAME_ART_SIZE[key]; return size ? size[1] / size[0] : 1; };
export const sceneSkin = (game: GameProgress) => (SKINS[game.skin]?.art && art(SKINS[game.skin].art!) ? game.skin : "sunny");
/** The wide (3:2) version of a skin for wider screens, when QT Gamer has made one (style.json homeSkin). */
export const wideSkinKey = (skin: string) => { const k = SKINS[skin]?.art + "-wide"; return GAME_ART[k] && GAME_ART_SIZE[k] ? k : null; };

type Props = {
  game: GameProgress; width: number; decor: Record<string, string | null>; decorating: boolean; selectedSlot: SlotId | null;
  /** First visit: sparkles twinkle more often. `fresh` keeps a steady sparkle on something new (the menu once it opens). */
  hint: boolean; fresh?: "menu" | null; onHot(id: HotId): void; onSlot(id: SlotId): void;
  /** Runs 0 → 1 after a tap on empty space (startReveal); the café screen owns it so a tap anywhere counts. */
  reveal: SharedValue<number>;
  /** False when Stage already shows the wide skin, whose middle is this room blended at the seams: drawing it again would bring back hard edges. */
  backdrop?: boolean;
};
/** The café room: backdrop, decor, the cook behind the counter, the companion, ambient motion and invisible hotspots. */
export function Scene({ game, width, decor, decorating, selectedSlot, hint, fresh = null, onHot, onSlot, reveal, backdrop = true }: Props) {
  const u = width / 100, skin = sceneSkin(game);
  const px = (b: Box) => ({ left: b[0] * u, top: b[1] * u, width: b[2] * u, height: b[3] * u });
  const bottomAt = (key: string, x: number, w: number, bottom: number) => { const h = w * artRatio(key); return { left: x * u, top: (bottom - h) * u, width: w * u, height: h * u }; };
  const petKey = (() => { const k = wearArt(game.pet, game.equip[game.pet] ?? null); return art(k) ? k : PETS[game.pet].art; })();
  const petW = PET.w * (PETS[game.pet].scale ?? 1), menuOpen = cleared(game, 5), petTop = PET.bottom - petW * artRatio(petKey);
  const { reducedMotion } = usePreferences(), petPoke = useSharedValue(0), cookPoke = useSharedValue(0), heart = useSharedValue(0), t = useT("game");
  const [timers] = useState(() => new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.forEach(clearTimeout), [timers]);
  // The companion and the cook react to a tap first; the sheet opens once the reaction has read.
  const tap = (id: HotId) => {
    const poke = id === "pet" ? petPoke : id === "avatar" ? cookPoke : null;
    if (!poke || reducedMotion) { onHot(id); return; }
    poke.value = 0; poke.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) });
    if (id === "pet") popOnce(heart);
    timers.forEach(clearTimeout); timers.clear();
    timers.add(setTimeout(() => onHot(id), 280));
  };
  const [mx, my, mw, mh] = backBox("menu", skin);
  // Lian, the companion and the stove need no marker: they move, steam and react. Backdrop objects get a sparkle.
  const sparkles: [number, number][] = [SPARKLE_AT.books, [mx + mw * 0.82, my + mh * 0.18], SPARKLE_AT.wardrobe].map(([x, y]) => [x * u, y * u]);
  const hots: { id: HotId; box: Box; name: string; core?: boolean }[] = [
    { id: "window", box: backBox("window", skin), name: t("hotWindow") },
    { id: "books", box: backBox("books", skin), name: t("hotBooks"), core: true },
    { id: "menu", box: backBox("menu", skin), name: menuOpen ? t("hotMenu") : t("hotMenuLocked") },
    { id: "wardrobe", box: backBox("wardrobe", skin), name: t("hotWardrobe"), core: true },
    { id: "avatar", box: [AVATAR.cx - AVATAR.w / 2, 66, AVATAR.w, 32], name: t("hotAvatar") },
    { id: "stove", box: STOVE, name: t("hotStove"), core: true },
    { id: "pet", box: [PET.x, petTop, petW, petW * artRatio(petKey)], name: t("hotPet", { pet: PETS[game.pet].name }), core: true },
  ];
  const decorImg = (slot: SlotId) => {
    const id = decor[slot]; if (!id || !DECOR[id]) return null;
    const d = DECOR[id], [x, y, w, h] = slotBox(slot, skin); let iw = w, ih = w * artRatio(d.art);
    if (ih > h) { ih = h; iw = h / artRatio(d.art); }
    const anchor = SLOTS[slot].anchor, top = anchor === "top" ? y : anchor === "bottom" ? y + h - ih : y + (h - ih) / 2;
    const box = { left: (x + (w - iw) / 2) * u, top: top * u, width: iw * u, height: ih * u };
    const img = <Image source={art(d.art)} resizeMode="contain" accessibilityIgnoresInvertColors style={s.fill} />;
    if (anchor === "center") return <View key={slot} style={[s.abs, box]}>{img}</View>;
    return <Sway key={slot} style={[s.abs, box]} deg={anchor === "top" ? 1.8 : 1.1} origin={anchor === "top" ? "top" : "bottom"} duration={anchor === "top" ? 3800 : 3000} delay={slot === "floorR" ? 700 : 0}>{img}</Sway>;
  };
  return <View style={{ width, height: width * 1.5 }} accessibilityLabel={t("myCafe", { name: game.cafeName })}>
    {backdrop && <Image source={art(SKINS[skin].art!)} style={[s.abs, { left: 0, top: 0, width, height: width * 1.5 }]} resizeMode="cover" />}
    <SunRays box={backBox("window", skin)} u={u} />
    <Glint box={backBox("window", skin)} u={u} />
    {decorImg("ceiling")}{decorImg("wall")}
    <Sway style={[s.abs, bottomAt("avatar-lian", AVATAR.cx - AVATAR.w / 2, AVATAR.w, AVATAR.bottom)]} deg={0.9} origin="bottom" duration={1900} poke={cookPoke}>
      <Image source={art("avatar-lian")} style={s.fill} resizeMode="contain" />
    </Sway>
    <Image source={art("cafe-counter")} style={[s.abs, bottomAt("cafe-counter", COUNTER.x, COUNTER.w, COUNTER.y + COUNTER.w * artRatio("cafe-counter"))]} resizeMode="contain" />
    {STATIONS_ON_COUNTER.filter(st => cleared(game, st.level)).map(st =>
      <Image key={st.id} source={art(st.art)} style={[s.abs, bottomAt(st.art, st.x, st.w, st.bottom)]} resizeMode="contain" accessibilityLabel={t(st.name)} />)}
    <Steam x={WOK.x} y={WOK.y} u={u} />
    <Hop style={[s.abs, bottomAt(petKey, PET.x, petW, PET.bottom)]} u={u} poke={petPoke}>
      <Image source={art(petKey)} style={s.fill} resizeMode="contain" />
    </Hop>
    {decorImg("floorL")}{decorImg("floorR")}
    <Motes u={u} />
    <Leaves u={u} />
    {!decorating && <SparkleCycle points={sparkles} strong={hint} steady={fresh === "menu" ? 1 : null} />}
    {!decorating && <HeartPop left={(PET.x + petW * 0.7) * u} top={petTop * u} pop={heart} />}
    {!decorating && hots.map(h => <HotSpot key={h.id} name={h.name} box={px(h.box)} onPress={() => tap(h.id)} reveal={reveal} order={REVEAL_ORDER.indexOf(h.id)} count={REVEAL_ORDER.length} />)}
    {decorating && (Object.keys(SLOTS) as SlotId[]).map(id => <DecorSlot key={id} id={id} box={px(slotBox(id, skin))} item={decor[id]} selected={selectedSlot === id} onPress={() => onSlot(id)} />)}
  </View>;
}

/**
 * An unlabelled hotspot: a sparkle or its own motion marks it at rest, a soft gold glow shows it after a tap on empty
 * space, a gold outline and wash light it under a pointer, light blooms under the finger, and keyboard focus shows a full ring.
 */
/** The café's tappable things, in the order the reveal glow visits them. */
export const REVEAL_ORDER: HotId[] = ["books", "window", "menu", "wardrobe", "avatar", "pet", "stove"];
function HotSpot({ name, box, onPress, reveal, order, count }: {
  name: string; box: { left: number; top: number; width: number; height: number }; onPress(): void; reveal: SharedValue<number>; order: number; count: number;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), p = useSharedValue(0), h = useSharedValue(0);
  return <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} {...focusProps}
    onHoverIn={() => { h.value = withTiming(1, { duration: 160 }); }} onHoverOut={() => { h.value = withTiming(0, { duration: 260 }); }}
    onPressIn={() => { p.value = withTiming(1, { duration: 140 }); }} onPressOut={() => { p.value = withTiming(0, { duration: 420 }); }}
    style={[s.abs, s.hot, box, { borderColor: focused ? theme.mediaRating : theme.transparent }]}>
    <RevealGlow run={reveal} order={order} count={count} />
    <HoverGlow h={h} />
    <PressGlow p={p} w={box.width} h={box.height} />
  </Pressable>;
}

/** Decorate mode: an empty spot is a dashed outline with a plus; the chosen spot has an accent outline. */
function DecorSlot({ id, box, item, selected, onPress }: { id: SlotId; box: object; item: string | null | undefined; selected: boolean; onPress(): void }) {
  const { theme } = usePreferences(), [hover, setHover] = useState(false), t = useT("game");
  const name = t("slotItem", { slot: t(SLOTS[id].name), item: item ? DECOR[item].name : t("slotEmpty") });
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
