import { Redirect, router, useIsFocused } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DestinationScreen } from "../../components/navigation/DestinationScreen";
import { gameEnabled } from "../../config/game";
import { ACCESSORIES, DECOR, PETS, SKINS, type Tier } from "../../game/content/cosmetics";
import { LEVELS } from "../../game/content/levels";
import { cleared, isUnlocked, nextLevel, type GameProgress } from "../../game/progress";
import { useGame } from "../../hooks/useGame";
import { usePreferences } from "../../state/Preferences";
import { Scene, sceneSkin, wideSkinKey, type HotId } from "./home/Scene";
import { stageFit, type SlotId } from "./home/sceneLayout";
import { Stage } from "./home/Stage";
import { useEnter } from "./home/Ambient";
import { CreditsPill, DecorTray, Pill, PlayButton } from "./home/Controls";
import { GameLobby } from "./Lobby";
import { LevelsSheet } from "./home/LevelsSheet";
import { BooksSheet } from "./home/BooksSheet";
import { CompanionSheet } from "./home/CompanionSheet";
import { CafeSheet } from "./home/CafeSheet";
import { AvatarSheet, LaterSheet, LotusSheet, MenuSheet } from "./home/InfoSheets";
import { PlaySettingsSheet } from "./home/PlaySettingsSheet";
import { FindReveal, type Find } from "./home/FindReveal";
import { Art } from "./home/bits";

type SheetId = "levels" | "books" | "regulars" | "companion" | "cafe" | "menu" | "avatar" | "lotus" | "window" | "settings" | null;

/** Unlocks earned by clears and not yet revealed, oldest first. */
function pendingFinds(g: GameProgress): Find[] {
  const out: Find[] = [];
  const add = (kind: Find["kind"], id: string, u: { kind: string; level?: number }) => { if (u.kind === "level" && cleared(g, u.level!) && !g.seen.includes(kind + ":" + id)) out.push({ kind, id, level: u.level! }); };
  Object.values(PETS).forEach(p => add("pet", p.id, p.unlock)); Object.values(ACCESSORIES).forEach(a => add("accessory", a.id, a.unlock));
  Object.values(DECOR).forEach(d => add("decor", d.id, d.unlock)); Object.values(SKINS).forEach(s => add("skin", s.id, s.unlock));
  return out.sort((a, b) => a.level - b.level);
}

export function GameScreen() {
  if (!gameEnabled) return <DestinationScreen kind="game" title="Rush Hour is on its way" message="A quick cooking game: plate hawker favourites, read the labels and keep every guest's food rules." action="Cook Something" href="/cook" />;
  return <GameLobby />;
}
/** The café, full screen at /game/cafe: no app navigation, a Back button returns to the Game tab. */
export function GameCafeScreen() {
  if (!gameEnabled) return <Redirect href="/game" />;
  return <CafeHome />;
}
const leave = () => { if (router.canGoBack()) router.back(); else router.replace("/game"); };

function CafeHome() {
  const { theme } = usePreferences();
  const insets = useSafeAreaInsets();
  const { game, set, save } = useGame();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [sheet, setSheet] = useState<SheetId>(null);
  const [deco, setDeco] = useState<Deco | null>(null);
  const focused = useIsFocused();
  const finds = useMemo(() => pendingFinds(game), [game]);
  const find = focused && sheet === null && !deco ? finds[0] : undefined;
  const n = nextLevel(game), lv = LEVELS[n - 1], allDone = cleared(game, 20);
  const bottom = insets.bottom + 16, trayH = 196 + insets.bottom;
  const fit = stageFit(size.w, size.h, deco ? trayH : bottom + 56 + 20, !!deco, insets.top + 60, !!wideSkinKey(sceneSkin(game)));
  const hudIn = useEnter(180, -14), barIn = useEnter(300, 18);

  const open = (sh: SheetId) => { if (!game.introSeen) set(g => ({ ...g, introSeen: true })); setSheet(sh); };
  const hot = (id: HotId) => open(({ books: "books", menu: "menu", window: "window", wardrobe: "avatar", stove: "levels", avatar: "avatar", pet: "companion" } as const)[id]);
  const play = (level: number, mode: "rush" | "calm", special?: string) => { setSheet(null); set(g => ({ ...g, mode }));
    router.push({ pathname: "/game/play", params: { level: String(level), mode, run: String(Date.now()), ...(special ? { special } : {}) } }); };
  const seeFind = (f: Find, equip: boolean) => set(g => {
    const next = { ...g, seen: [...g.seen, f.kind + ":" + f.id] };
    if (!equip) return next;
    if (f.kind === "accessory") return { ...next, equip: { ...next.equip, [g.pet]: f.id } };
    if (f.kind === "pet") return { ...next, pet: f.id };
    if (f.kind === "skin") return { ...next, skin: f.id };
    return next;
  });
  const startDeco = () => { if (!game.introSeen) set(g => ({ ...g, introSeen: true })); setDeco({ draft: { ...game.decor }, history: [], slot: null }); };
  return <View style={[s.root, { backgroundColor: theme.mediaSurface }]} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
    {size.w > 0 && <Stage skin={sceneSkin(game)} W={size.w} H={size.h} fit={fit} insetTop={insets.top}>
      <Scene game={game} width={fit.width} decor={deco?.draft ?? game.decor} decorating={!!deco} selectedSlot={deco?.slot ?? null}
        hint={!game.introSeen} backdrop={!(wideSkinKey(sceneSkin(game)) && fit.width < size.w)} onHot={hot} onSlot={id => setDeco(d => d && { ...d, slot: id })} />
    </Stage>}
    <Animated.View style={[s.hud, { top: insets.top + 6, left: insets.left + 10, right: insets.right + 10 }, hudIn]}>
      {deco ? <DecoHud deco={deco} game={game} setDeco={setDeco} save={save} /> : <>
        <Pill icon="chevron-back" label="Back to Game" onPress={leave} />
        <Pill shrink text={game.cafeName} icon="storefront" label={"Café details, " + game.cafeName} onPress={() => open("cafe")} />
        <View style={{ flex: 1 }} />
        <CreditsPill credits={game.credits} />
        <Pill label={game.tier ? "Your lotus: " + game.tier : "Your lotus"} onPress={() => open("lotus")}><Art k={game.tier ? "lotus-" + game.tier : "lotus-bud-pink"} size={28} /></Pill>
        <Pill icon="options-outline" label="Play your way" onPress={() => open("settings")} />
      </>}
    </Animated.View>
    {!deco && size.w > 0 && <Animated.View pointerEvents="box-none" style={[s.bar, { bottom }, barIn]}>
      <PlayButton title={allDone ? "Play again" : "Play"} sub={allDone ? "Pick any level" : "Level " + n + " · " + lv.name} onPlay={() => open("levels")} />
    </Animated.View>}
    {deco && <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: trayH }}>
      <DecorTray game={game} draft={deco.draft} slot={deco.slot} height={trayH} onPut={id => setDeco(d => putDecor(d, id))} /></View>}
    <HomeSheets sheet={sheet} setSheet={setSheet} game={game} set={set} save={save} play={play} onDecorate={startDeco} />
    {find && <FindReveal find={find} pet={game.pet} onEquip={() => seeFind(find, true)} onKeep={() => seeFind(find, false)} />}
  </View>;
}

type GameApi = ReturnType<typeof useGame>;
function HomeSheets({ sheet, setSheet, game, set, save, play, onDecorate }: {
  sheet: SheetId; setSheet(s: SheetId): void; game: GameProgress; set: GameApi["set"]; save: GameApi["save"]; play(level: number, mode: "rush" | "calm", special?: string): void; onDecorate(): void;
}) {
  const close = () => setSheet(null);
  if (sheet === "levels") return <LevelsSheet game={game} onClose={close} onPlay={play} onCompanion={() => setSheet("companion")} onMode={m => set(g => ({ ...g, mode: m }))} />;
  if (sheet === "books" || sheet === "regulars") return <BooksSheet game={game} initial={sheet === "regulars" ? "regulars" : "recipes"} onClose={close} />;
  if (sheet === "companion") return <CompanionSheet game={game} onClose={close} onChoose={p => set(g => ({ ...g, pet: p }))} onWear={(p, a) => set(g => ({ ...g, equip: { ...g.equip, [p]: a } }))} />;
  if (sheet === "cafe") return <CafeSheet game={game} onClose={close} onDecorate={() => { close(); onDecorate(); }} onName={nm => set(g => ({ ...g, cafeName: nm.trim().slice(0, 18) || "My Café" }))}
    onSkin={id => set(g => ({ ...g, skin: id }))} onBuy={id => save(g => { const d = DECOR[id]; if (d.unlock.kind !== "credits" || g.credits < d.unlock.price || g.owned.includes(id)) return g;
      return { ...g, credits: g.credits - d.unlock.price, owned: [...g.owned, id] }; })} />;
  if (sheet === "menu") return <MenuSheet game={game} onClose={close} onSignature={ids => set(g => ({ ...g, signature: ids }))} onSpecial={day => play(1, game.mode, day)} />;
  if (sheet === "settings") return <PlaySettingsSheet settings={game.settings} onChange={next => set(g => ({ ...g, settings: next }))} onClose={close} />;
  if (sheet === "avatar") return <AvatarSheet onClose={close} onCompanion={() => setSheet("companion")} />;
  if (sheet === "lotus") return <LotusSheet game={game} onClose={close} onTier={(t: Tier | null) => set(g => { const next = { ...g, tier: t }; return isUnlocked(next, PETS[g.pet].unlock) ? next : { ...next, pet: "sprout" }; })} />;
  if (sheet === "window") return <LaterSheet title="Stall visits" onClose={close} text="Visit someone else's hawker stall as the customer and choose which questions to ask. It ends on your own Ask-the-stall card." />;
  return null;
}

type Deco = { draft: Record<string, string | null>; history: Record<string, string | null>[]; slot: SlotId | null };
/** Puts an item (or nothing) in the chosen spot; an item already elsewhere moves here. */
function putDecor(d: Deco | null, id: string | null): Deco | null {
  if (!d || !d.slot) return d;
  const draft = { ...d.draft }; if (id) for (const k of Object.keys(draft)) if (draft[k] === id) draft[k] = null;
  draft[d.slot] = id; return { ...d, draft, history: [...d.history, d.draft] };
}
function DecoHud({ deco, game, setDeco, save }: { deco: Deco; game: GameProgress; setDeco(f: (d: Deco | null) => Deco | null): void; save: GameApi["save"] }) {
  const changed = JSON.stringify(deco.draft) !== JSON.stringify(game.decor);
  const done = async () => { if (await save(g => ({ ...g, decor: deco.draft as GameProgress["decor"] }))) setDeco(() => null); };
  return <>
    <Pill icon="close" label="Leave decorate" onPress={() => { if (!changed) setDeco(() => null); else confirmDiscard(() => setDeco(() => null)); }} />
    <View style={{ flex: 1 }} />
    <Pill icon="arrow-undo" label="Undo" disabled={!deco.history.length} onPress={() => setDeco(d => d && d.history.length ? { ...d, draft: d.history[d.history.length - 1], history: d.history.slice(0, -1) } : d)} />
    <Pill text="Save" label="Save" strong onPress={done} />
  </>;
}

function confirmDiscard(discard: () => void) {
  if (Platform.OS === "web") { if (globalThis.confirm?.("Discard your changes? Your café goes back to how it was.")) discard(); return; }
  Alert.alert("Discard your changes?", "Your café goes back to how it was when you started decorating.", [{ text: "Keep decorating", style: "cancel" }, { text: "Discard", style: "destructive", onPress: discard }]);
}
const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  hud: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 },
  bar: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
