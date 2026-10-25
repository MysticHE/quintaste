import { Redirect, router, useIsFocused } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DestinationScreen } from "../../components/navigation/DestinationScreen";
import { gameEnabled } from "../../config/game";
import { ACCESSORIES, DECOR, PETS, SKINS, type Unlock } from "../../game/content/cosmetics";
import { SEASONS } from "../../game/content/seasons";
import { LEVELS } from "../../game/content/levels";
import { cleared, isUnlocked, nextLevel, type GameProgress } from "../../game/progress";
import { useGame } from "../../hooks/useGame";
import { useLotus } from "../../hooks/useLotus";
import { useGameSwitch } from "../../state/game-sync";
import { usePreferences } from "../../state/Preferences";
import { REVEAL_ORDER, Scene, sceneSkin, wideSkinKey, type HotId } from "./home/Scene";
import { startReveal } from "./home/SceneFx";
import { stageFit, type SlotId } from "./home/sceneLayout";
import { Stage } from "./home/Stage";
import { useEnter } from "./home/Ambient";
import { CreditsPill, DecorTray, Pill, PlayButton } from "./home/Controls";
import { GameLobby } from "./Lobby";
import { GamePreferences } from "./GamePreferences";
import { useCafeFeedback } from "../../game/cafe-feedback";
import { LevelsSheet } from "./home/LevelsSheet";
import { BooksSheet } from "./home/BooksSheet";
import { CompanionSheet } from "./home/CompanionSheet";
import { CafeSheet } from "./home/CafeSheet";
import { AvatarSheet, LotusSheet, MenuSheet } from "./home/InfoSheets";
import { OutAndAboutSheet } from "./home/Cafes";
import { PlaySettingsSheet } from "./home/PlaySettingsSheet";
import { FindReveal, type Find } from "./home/FindReveal";
import { Art, LOTUS_TIER_KEYS, type GameT } from "./home/bits";
import { useT } from "../../i18n";

/**
 * Navigates once a closing sheet has gone (InteractionManager is removed in React Native 0.88). iOS drops a push made
 * while a Modal is still dismissing, so it waits out the ~300 ms dismissal there; elsewhere the next frame is enough.
 */
const SHEET_DISMISS_MS = Platform.OS === "ios" ? 350 : 0;
const afterInteractions = (run: () => void) => requestAnimationFrame(() => setTimeout(run, SHEET_DISMISS_MS));

/** Stored in `seen` once the chalkboard menu has been opened, so its steady "something new" sparkle stops. */
const MENU_SEEN = "hot:menu";
type SheetId = "levels" | "books" | "regulars" | "companion" | "cafe" | "menu" | "avatar" | "lotus" | "window" | "settings" | null;

/** Unlocks earned by clears and not yet revealed, oldest first. */
function pendingFinds(g: GameProgress, t: GameT): Find[] {
  const out: Find[] = [];
  const add = (kind: Find["kind"], id: string, u: Unlock) => {
    if (g.seen.includes(kind + ":" + id) || (u.kind !== "level" && u.kind !== "season") || !isUnlocked(g, u)) return;
    // Season finds sort after the main path's, in season order.
    out.push(u.kind === "level" ? { kind, id, level: u.level, from: t("findFromLevel", { n: u.level }) }
      : { kind, id, level: 1000 + SEASONS.findIndex(s => s.id === u.season) * 10 + u.n,
        from: t("findFromSeason", { season: SEASONS.find(s => s.id === u.season)?.name ?? t("theSeason"), n: u.n }) });
  };
  Object.values(PETS).forEach(p => add("pet", p.id, p.unlock)); Object.values(ACCESSORIES).forEach(a => add("accessory", a.id, a.unlock));
  Object.values(DECOR).forEach(d => add("decor", d.id, d.unlock)); Object.values(SKINS).forEach(s => add("skin", s.id, s.unlock));
  return out.sort((a, b) => a.level - b.level);
}

export function GameScreen() {
  const on = useGameSwitch(), t = useT("game");
  if (!gameEnabled || !on) return <DestinationScreen kind="game" title={t("comingTitle")} message={t("comingMessage")} action={t("cookSomething")} href="/cook" />;
  return <GamePreferences><GameLobby /></GamePreferences>;
}
/** The café, full screen at /game/cafe: no app navigation, a Back button returns to the Game tab. */
export function GameCafeScreen() {
  const on = useGameSwitch();
  if (!gameEnabled || !on) return <Redirect href="/game" />;
  return <GamePreferences><CafeHome /></GamePreferences>;
}
const leave = () => { if (router.canGoBack()) router.back(); else router.replace("/game"); };

function CafeHome() {
  const { theme, reducedMotion } = usePreferences();
  const insets = useSafeAreaInsets();
  const { game, set, save, buy } = useGame(), t = useT("game");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [sheet, setSheet] = useState<SheetId>(null);
  const [deco, setDeco] = useState<Deco | null>(null);
  const focused = useIsFocused();
  const finds = useMemo(() => pendingFinds(game, t), [game, t]);
  const find = focused && sheet === null && !deco ? finds[0] : undefined;
  const n = nextLevel(game), lv = LEVELS[n - 1], allDone = cleared(game, LEVELS.length);
  const bottom = insets.bottom + 16, trayH = 196 + insets.bottom;
  const fit = stageFit(size.w, size.h, deco ? trayH : bottom + 56 + 20, !!deco, insets.top + 90, !!wideSkinKey(sceneSkin(game)));
  const hudIn = useEnter(180, -14), barIn = useEnter(300, 18);

  const { sound, buzz } = useCafeFeedback(game.settings, focused);
  const reveal = useSharedValue(0);
  // "New" only right after Level 5 unlocks it: players already past Level 6 have used the menu before this marker existed.
  const menuNew = cleared(game, 5) && !cleared(game, 6) && !game.seen.includes(MENU_SEEN);
  const open = (sh: SheetId) => {
    if (!game.introSeen || (sh === "menu" && menuNew)) set(g => ({ ...g, introSeen: true, seen: sh === "menu" && !g.seen.includes(MENU_SEEN) ? [...g.seen, MENU_SEEN] : g.seen }));
    setSheet(sh);
  };
  // One way to each place: the mirror is the wardrobe and the stove the level list; tapping Lian only makes Lian cheer.
  const hot = (id: HotId) => {
    sound(id === "pet" || id === "avatar" ? "boing" : "tap"); buzz("tap");
    if (id !== "avatar") open(({ books: "books", menu: "menu", window: "window", wardrobe: "avatar", stove: "levels", pet: "companion" } as const)[id]);
  };
  // Navigate once the sheet's Modal has gone: on iOS a push during a Modal dismissal can be dropped.
  const playMission = (pack: string, tier: string) => { setSheet(null);
    afterInteractions(() => router.push({ pathname: "/game/play", params: { pack, tier, run: String(Date.now()) } })); };
  const playSeason = (season: string, n: number) => { setSheet(null);
    afterInteractions(() => router.push({ pathname: "/game/play", params: { season, n: String(n), run: String(Date.now()) } })); };
  const play = (level: number, special?: string) => { setSheet(null);
    afterInteractions(() => router.push({ pathname: "/game/play", params: { level: String(level), run: String(Date.now()), ...(special ? { special } : {}) } })); };
  // Android Back leaves decorate mode, asking first when there are unsaved changes.
  useEffect(() => {
    if (!deco) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (JSON.stringify(deco.draft) === JSON.stringify(game.decor)) setDeco(null); else confirmDiscard(t, () => setDeco(null));
      return true;
    });
    return () => sub.remove();
  }, [deco, game.decor, t]);
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
    {/* A tap on empty space lights every tappable thing, one at a time, so a lost player finds them all. Touch handling only (not a focusable button): hotspots claim their own taps first, and on web a focused full-screen wrapper would scroll the room. */}
    {size.w > 0 && <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => !deco} onResponderRelease={() => startReveal(reveal, REVEAL_ORDER.length, reducedMotion)}>
    <Stage skin={sceneSkin(game)} W={size.w} H={size.h} fit={fit} insetTop={insets.top}>
      <Scene game={game} width={fit.width} decor={deco?.draft ?? game.decor} decorating={!!deco} selectedSlot={deco?.slot ?? null}
        hint={!game.introSeen} fresh={menuNew ? "menu" : null} backdrop={!(wideSkinKey(sceneSkin(game)) && fit.width < size.w)} onHot={hot} onSlot={id => setDeco(d => d && { ...d, slot: id })} reveal={reveal} />
    </Stage></View>}
    <Animated.View style={[s.hud, { top: insets.top + 6, left: insets.left + 10, right: insets.right + 10 }, hudIn]}>
      {deco ? <DecoHud deco={deco} game={game} setDeco={setDeco} save={save} /> : <>
        <Pill icon="chevron-back" label={t("backToGame")} onPress={leave} />
        <Pill shrink text={game.cafeName} icon="storefront" label={t("cafeDetailsFor", { name: game.cafeName })} onPress={() => open("cafe")} />
        <View style={{ flex: 1 }} />
        <CreditsPill credits={game.credits} />
        <Pill label={game.tier ? t("yourLotusTier", { tier: game.tier, name: t(LOTUS_TIER_KEYS[game.tier]) }) : t("yourLotus")} onPress={() => open("lotus")}><Art k={game.tier ? "lotus-" + game.tier : "lotus-bud-pink"} size={28} /></Pill>
        <Pill icon="options-outline" label={t("playYourWay")} onPress={() => open("settings")} />
      </>}
    </Animated.View>
    {!deco && size.w > 0 && <Animated.View pointerEvents="box-none" style={[s.bar, { bottom }, barIn]}>
      <PlayButton title={allDone ? t("playAgain") : t("play")} sub={allDone ? t("pickAnyLevel") : t("levelName", { n, name: lv.name })}
        onPlay={() => { buzz("tap"); if (allDone) open("levels"); else play(n); }} />
    </Animated.View>}
    {deco && <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: trayH }}>
      <DecorTray game={game} draft={deco.draft} slot={deco.slot} height={trayH} onPut={id => setDeco(d => putDecor(d, id))} /></View>}
    <HomeSheets sheet={sheet} setSheet={setSheet} game={game} set={set} buy={buy} play={play} playMission={playMission} playSeason={playSeason} onDecorate={startDeco} />
    {find && <FindReveal find={find} pet={game.pet} onEquip={() => seeFind(find, true)} onKeep={() => seeFind(find, false)} />}
  </View>;
}

type GameApi = ReturnType<typeof useGame>;
function HomeSheets({ sheet, setSheet, game, set, buy, play, playMission, playSeason, onDecorate }: {
  sheet: SheetId; setSheet(s: SheetId): void; game: GameProgress; set: GameApi["set"]; buy: GameApi["buy"]; play(level: number, special?: string): void;
  playMission(pack: string, tier: string): void; playSeason(season: string, n: number): void; onDecorate(): void;
}) {
  const { member } = useLotus();
  const close = () => setSheet(null);
  if (sheet === "levels") return <LevelsSheet game={game} onClose={close} onPlay={play} onPlayMission={playMission} onPlaySeason={playSeason} onCompanion={() => setSheet("companion")} />;
  if (sheet === "books" || sheet === "regulars") return <BooksSheet game={game} initial={sheet === "regulars" ? "regulars" : "recipes"} onClose={close} />;
  if (sheet === "companion") return <CompanionSheet game={game} onClose={close} onChoose={p => set(g => ({ ...g, pet: p }))} onWear={(p, a) => set(g => ({ ...g, equip: { ...g.equip, [p]: a } }))} />;
  if (sheet === "cafe") return <CafeSheet game={game} onClose={close} onDecorate={() => { close(); onDecorate(); }} onName={nm => set(g => ({ ...g, cafeName: nm.trim().slice(0, 18) || "My Café" }))}
    onSkin={id => set(g => ({ ...g, skin: id }))} onBuy={id => void buy(id)} />;
  if (sheet === "menu") return <MenuSheet game={game} onClose={close} onSignature={ids => set(g => ({ ...g, signature: ids }))} onSpecial={day => play(1, day)} />;
  if (sheet === "settings") return <PlaySettingsSheet settings={game.settings} onChange={next => set(g => ({ ...g, settings: next }))} onClose={close} />;
  if (sheet === "avatar") return <AvatarSheet onClose={close} onCompanion={() => setSheet("companion")} />;
  if (sheet === "lotus") return <LotusSheet tier={game.tier} member={member} onClose={close} />;
  if (sheet === "window") return <OutAndAboutSheet onClose={close} onVisit={host => { close(); afterInteractions(() => router.push({ pathname: "/game/play", params: { cafe: host, run: String(Date.now()) } })); }} />;
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
  const changed = JSON.stringify(deco.draft) !== JSON.stringify(game.decor), t = useT("game");
  const done = async () => { if (await save(g => ({ ...g, decor: deco.draft as GameProgress["decor"] }))) setDeco(() => null); };
  return <>
    <Pill icon="close" label={t("leaveDecorate")} onPress={() => { if (!changed) setDeco(() => null); else confirmDiscard(t, () => setDeco(() => null)); }} />
    <View style={{ flex: 1 }} />
    <Pill icon="arrow-undo" label={t("undo")} disabled={!deco.history.length} onPress={() => setDeco(d => d && d.history.length ? { ...d, draft: d.history[d.history.length - 1], history: d.history.slice(0, -1) } : d)} />
    <Pill text={t("saveChanges")} label={t("saveChanges")} strong onPress={done} />
  </>;
}

function confirmDiscard(t: GameT, discard: () => void) {
  if (Platform.OS === "web") { if (globalThis.confirm?.(t("discardConfirm"))) discard(); return; }
  Alert.alert(t("discardTitle"), t("discardBody"), [{ text: t("keepDecorating"), style: "cancel" }, { text: t("discard"), style: "destructive", onPress: discard }]);
}
const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  hud: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 },
  bar: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
