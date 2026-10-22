import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FieldLabel, ThemedSwitch } from "../../../components/GroupedList";
import { ReportSheet } from "../../../components/ReportSheet";
import { Button, Field, Icon, T } from "../../../components/ui";
import { CAFE_TERMS, CAFE_TERMS_VERSION } from "../../../config/game-cafes";
import type { GameProgress } from "../../../game/progress";
import { useGameMemberId } from "../../../hooks/useGame";
import { useCafesOn, useKitchen } from "../../../hooks/useKitchen";
import { useRemote } from "../../../hooks/useRemote";
import { ApiError } from "../../../services/community-api";
import { fetchCafes, fetchMyCafe, saveMyCafe, type MyCafe } from "../../../services/game-api";
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
  if (!memberId || !on || !mine.data) return null;
  // The form starts from what is saved and starts again after each save, so it never copies the server's answer in an effect.
  const saved = mine.data, key = JSON.stringify([saved.cafe, saved.menu.map(m => m.hash)]);
  return <CafeForm key={key} saved={saved} fallbackName={game.cafeName} onSaved={mine.refresh} />;
}

function CafeForm({ saved, fallbackName, onSaved }: { saved: MyCafe; fallbackName: string; onSaved(): void }) {
  const { theme, setNotice } = usePreferences();
  const shelf = useKitchen().data?.levels.filter(l => !l.mine) ?? [];
  const [name, setName] = useState(saved.cafe?.name ?? fallbackName), [menu, setMenu] = useState(saved.menu.map(m => m.hash));
  const [open, setOpen] = useState(!!saved.cafe?.open), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const accepted = !!saved.cafe?.termsAccepted;
  const toggle = (hash: string) => setMenu(m => m.includes(hash) ? m.filter(h => h !== hash) : m.length < MENU_MAX ? [...m, hash] : m);
  const save = async () => {
    setBusy(true); setError("");
    try {
      await saveMyCafe({ name, open, menu, ...(agree ? { terms: CAFE_TERMS_VERSION } : {}) });
      setNotice({ text: open ? "Your café is open" : "Café saved" }); onSaved();
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : "That did not save. Try again."); }
    finally { setBusy(false); }
  };
  // Your own reviewed recipes lead the list, then the rest of the shelf.
  const choices = [...shelf.filter(l => l.recipeId.startsWith("member-")), ...shelf.filter(l => !l.recipeId.startsWith("member-"))];
  return <Section title="Open my café">
    {saved.cafe?.hidden && <T variant="small" color={theme.error}>Staff closed your café after a report.</T>}
    {saved.cafe?.open && <T variant="small" muted>This week: {saved.week.visits} {saved.week.visits === 1 ? "visit" : "visits"}, {saved.week.served} served. Only you see this.</T>}
    <Field label="Name on the sign" value={name} maxLength={30} onChangeText={setName} editable={!busy} />
    <FieldLabel>{"Menu · " + menu.length + " of " + MENU_MAX}</FieldLabel>
    {!choices.length && <T variant="small" muted>No reviewed recipe levels yet.</T>}
    {choices.map(l => { const picked = menu.includes(l.hash);
      return <Pressable key={l.hash} onPress={() => toggle(l.hash)} disabled={busy || (!picked && menu.length >= MENU_MAX)} accessibilityRole="checkbox" accessibilityState={{ checked: picked }}
        accessibilityLabel={l.name} style={({ pressed }) => [s.row, { borderColor: picked ? theme.accent : theme.border, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name={picked ? "checkbox" : "square-outline"} size={20} color={picked ? theme.accent : theme.mutedForeground} />
        <T numberOfLines={1} style={{ flex: 1 }}>{l.name}</T>
      </Pressable>; })}
    {!accepted && <View style={{ gap: 4 }}><FieldLabel>Café terms</FieldLabel>{CAFE_TERMS.map(t => <T key={t} variant="small" muted>• {t}</T>)}
      <ThemedSwitch label="I accept the café terms" value={agree} onChange={setAgree} disabled={busy} /></View>}
    <ThemedSwitch label="Open to visitors" value={open} onChange={setOpen} disabled={busy || !!saved.cafe?.hidden} />
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
      {cafes.data && !cafes.data.cafes.length && <T variant="small" muted>{q ? "No open cafés match." : "No cafés are open yet."}</T>}
      {cafes.data?.cafes.map(c => <View key={c.host} style={[s.cafe, { borderColor: theme.border }]}>
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }} numberOfLines={1}>{c.name}</T>
          <T variant="small" muted numberOfLines={2}>{c.dishes.join(" · ")}</T></View>
        <Button label="Visit" variant="secondary" onPress={() => onVisit(c.host)} />
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
