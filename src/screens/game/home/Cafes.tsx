import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FieldLabel, ThemedSwitch } from "../../../components/GroupedList";
import { RemoteStatus } from "../../../components/CommunityGate";
import { ReportSheet } from "../../../components/ReportSheet";
import { Button, Field, Icon, T } from "../../../components/ui";
import { CAFE_TERMS, CAFE_TERMS_VERSION } from "../../../config/game-cafes";
import type { GameProgress } from "../../../game/progress";
import { useGameMemberId } from "../../../hooks/useGame";
import { useCafesOn, useKitchen } from "../../../hooks/useKitchen";
import { useMyRecipeStatus } from "../../../hooks/useMemberRecipes";
import { useRemote } from "../../../hooks/useRemote";
import { ApiError } from "../../../services/community-api";
import { fetchCafes, fetchMyCafe, saveMyCafe, type KitchenLevel, type MyCafe } from "../../../services/game-api";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";

/** Up to six dishes on a café menu (server/game/cafes.mjs MENU_MAX). */
const MENU_MAX = 6;

/**
 * Open my café (GAME_CONTENT_PLAN §9): off until the member opens it. Its menu holds up to six reviewed recipe levels; opening it
 * needs the café terms. Only the host sees this week's counts. Shown only to members while staff have cafés on.
 */
export function OpenMyCafe({ game }: { game: GameProgress }) {
  const memberId = useGameMemberId(), on = useCafesOn();
  const mine = useRemote(memberId && on ? "game-my-cafe" : null, signal => fetchMyCafe(signal));
  // The menu offers what is on the shelf now; loaded here once, so saving (which starts the form again) doesn't reload it.
  const kitchen = useKitchen(!!memberId && on), authored = useMyRecipeStatus();
  if (!memberId || !on || !mine.data) return null;
  if (!kitchen.data) return <Section title="Open my café"><RemoteStatus remote={kitchen} icon="storefront-outline" returnTo="/game/cafe" /></Section>;
  // The form starts from what is saved and starts again after each save, so it never copies the server's answer in an effect.
  const saved = mine.data, key = JSON.stringify([saved.cafe, saved.menu.map(m => m.hash)]);
  const own = new Set(authored.data?.items.map(r => r.id));
  return <CafeForm key={key} saved={saved} shelf={kitchen.data.levels} own={own} fallbackName={game.cafeName} onSaved={mine.refresh} />;
}

type Choice = { hash: string; recipeId: string; name: string };
/**
 * The dishes a café menu can hold: reviewed (public) levels on the shelf, the host's own recipes first. A saved dish whose recipe the
 * shelf now shows as the host's private level stays offered, since the shelf lists only each recipe's newest level; any other saved
 * dish that left the shelf is dropped, so a withdrawn level is never sent again.
 */
function menuChoices(shelf: KitchenLevel[], saved: MyCafe["menu"], own: Set<string>): Choice[] {
  const onShelf = new Set(shelf.map(l => l.hash)), privateRecipe = new Set(shelf.filter(l => l.mine).map(l => l.recipeId));
  const list: Choice[] = [...shelf.filter(l => !l.mine), ...saved.filter(m => !onShelf.has(m.hash) && privateRecipe.has(m.recipeId))];
  const mineFirst = (c: Choice) => own.has(c.recipeId) || privateRecipe.has(c.recipeId) ? 0 : 1;
  return list.map((c, i) => ({ c, i })).sort((a, b) => mineFirst(a.c) - mineFirst(b.c) || a.i - b.i).map(({ c }) => ({ hash: c.hash, recipeId: c.recipeId, name: c.name }));
}

function CafeForm({ saved, shelf, own, fallbackName, onSaved }: { saved: MyCafe; shelf: KitchenLevel[]; own: Set<string>; fallbackName: string; onSaved(): void }) {
  const { theme, setNotice } = usePreferences();
  const choices = menuChoices(shelf, saved.menu, own), offered = new Set(choices.map(c => c.hash));
  const [name, setName] = useState(saved.cafe?.name ?? fallbackName), [chosen, setChosen] = useState(saved.menu.map(m => m.hash));
  const [open, setOpen] = useState(!!saved.cafe?.open), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  // Only dishes still offered count and are sent, so one that left the shelf can't block every save.
  const menu = chosen.filter(h => offered.has(h));
  // The server names the terms version it needs; an older app can't show those terms, so it can't open the café.
  const accepted = !!saved.cafe?.termsAccepted, current = saved.terms === CAFE_TERMS_VERSION, canOpen = accepted || current;
  const toggle = (hash: string) => setChosen(m => { const live = m.filter(h => offered.has(h));
    return live.includes(hash) ? live.filter(h => h !== hash) : live.length < MENU_MAX ? [...live, hash] : live; });
  const save = async () => {
    setBusy(true); setError("");
    try {
      const opening = open && canOpen;
      await saveMyCafe({ name, open: opening, menu, ...(agree && current ? { terms: saved.terms } : {}) });
      setNotice({ text: opening ? "Your café is open" : "Café saved" }); onSaved();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "That did not save. Try again."); }
    finally { setBusy(false); }
  };
  return <Section title="Open my café">
    {saved.cafe?.hidden && <T variant="small" color={theme.error}>Staff closed your café after a report.</T>}
    {saved.cafe?.open && <T variant="small" muted>This week: {saved.week.visits} {saved.week.visits === 1 ? "visit" : "visits"}, {saved.week.served} served. Only you see this.</T>}
    <Field label="Name on the sign" value={name} maxLength={30} onChangeText={setName} editable={!busy} />
    <FieldLabel>{"Menu · " + menu.length + " of " + MENU_MAX}</FieldLabel>
    {!choices.length && <T variant="small" muted>No reviewed recipe levels yet.</T>}
    {choices.map(l => { const picked = menu.includes(l.hash), disabled = busy || (!picked && menu.length >= MENU_MAX);
      return <Pressable key={l.hash} onPress={() => toggle(l.hash)} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: picked, disabled }}
        accessibilityLabel={l.name} style={({ pressed }) => [s.row, { borderColor: picked ? theme.accent : theme.border, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name={picked ? "checkbox" : "square-outline"} size={20} color={picked ? theme.accent : theme.mutedForeground} />
        <T numberOfLines={1} style={{ flex: 1 }}>{l.name}</T>
      </Pressable>; })}
    {!canOpen ? <T variant="small" muted>Update the app to open your café.</T>
      : !accepted && <View style={{ gap: 4 }}><FieldLabel>Café terms</FieldLabel>{CAFE_TERMS.map(t => <T key={t} variant="small" muted>• {t}</T>)}
        <ThemedSwitch label="I accept the café terms" value={agree} onChange={setAgree} disabled={busy} /></View>}
    <ThemedSwitch label="Open to visitors" value={open && canOpen} onChange={setOpen} disabled={busy || !canOpen || !!saved.cafe?.hidden} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Save Café" icon="storefront-outline" loading={busy} onPress={() => void save()} />
  </Section>;
}

/** The window (GAME_CONTENT_PLAN §9, open decision 5): Out and about, with Stall visits (later) and members' cafés to visit. */
export function OutAndAboutSheet({ onClose, onVisit }: { onClose(): void; onVisit(host: string): void }) {
  const memberId = useGameMemberId(), on = useCafesOn(), { theme } = usePreferences();
  const [draft, setDraft] = useState(""), [q, setQ] = useState(""), [report, setReport] = useState<{ host: string; name: string } | null>(null);
  const cafes = useRemote(memberId && on ? "game-cafes:" + q : null, signal => fetchCafes(q, signal));
  return <GameSheet title="Out and about" onClose={onClose}>
    {memberId && on && <Section title="Cafés">
      <Field label="Find a café or dish" value={draft} maxLength={40} onChangeText={setDraft} onSubmitEditing={() => setQ(draft.trim())} returnKeyType="search" />
      <RemoteStatus remote={cafes} icon="storefront-outline" returnTo="/game/cafe" />
      {cafes.data && !cafes.data.cafes.length && <T variant="small" muted>{q ? "No open cafés match." : "No cafés are open yet."}</T>}
      {cafes.data?.cafes.map(c => <View key={c.host} style={[s.cafe, { borderColor: theme.border }]}>
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }} numberOfLines={1}>{c.name}</T>
          <T variant="small" muted numberOfLines={2}>{c.dishes.join(" · ")}</T></View>
        <Button label="Visit" variant="secondary" accessibilityLabel={"Visit " + c.name} onPress={() => onVisit(c.host)} />
        <Pressable onPress={() => setReport({ host: c.host, name: c.name })} accessibilityRole="button" accessibilityLabel={"Report " + c.name} hitSlop={8} style={s.flag}>
          <Icon name="flag-outline" size={18} color={theme.mutedForeground} /></Pressable>
      </View>)}
    </Section>}
    <Section title="Stall visits"><T muted>Coming in a later update: visit someone else&apos;s hawker stall as the customer and choose which questions to ask.</T></Section>
    {report && <ReportSheet kind="cafe" targetId={report.host} name={report.name} visible onClose={() => setReport(null)} />}
  </GameSheet>;
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5 },
  cafe: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  flag: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
