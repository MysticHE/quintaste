import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Chip } from "../../../components/food/Controls";
import { T } from "../../../components/ui";
import { ingredientGuide } from "../../../data/ingredient-guide";
import { cookRecipeId, ingredientTerm, nearbyTerm, openFoodChoices, openIngredient, openNearby, openRecipe } from "../../../game/bridges";
import { DISHES } from "../../../game/content/dishes";
import { GUESTS, RULES, type Rule } from "../../../game/content/guests";
import { ITEMS, itemName } from "../../../game/content/items";
import { LEVELS } from "../../../game/content/levels";
import { cleared, highestCleared, nextLevel, type GameProgress } from "../../../game/progress";
import { useKeyboardFocus } from "../../../hooks/useKeyboardFocus";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Art, Grid, Seg } from "./bits";

type Tab = "recipes" | "pantry" | "regulars";
/** First level in which each dish, ingredient and regular appears, and which dishes use each ingredient. */
function firsts() {
  const dish: Record<string, number> = {}, item: Record<string, number> = {}, guest: Record<string, number> = {}, uses: Record<string, Set<string>> = {};
  for (const lv of LEVELS) for (const o of lv.orders) {
    guest[o.guest] ??= lv.n;
    if (o.dish === "*") continue;
    dish[o.dish] ??= lv.n;
    DISHES[o.dish].parts.forEach(p => p.stages.forEach(st => st.slots.forEach(sl => sl.accepts.forEach(a => { item[a] ??= lv.n; (uses[a] ??= new Set()).add(o.dish); }))));
  }
  return { dish, item, guest, uses };
}
const FIRST = firsts();
/** Rules an ingredient breaks; the five pungent and Jain cards also offer Set my food choices (never prefilled). */
const breaks = (id: string) => (Object.keys(RULES) as Rule[]).filter(r => RULES[r].tags.some(t => ITEMS[id]?.tags?.includes(t)));
const choicesRule = (rules: Rule[]) => rules.includes("five") || rules.includes("jain");

export function BooksSheet({ game, initial = "recipes", onClose }: { game: GameProgress; initial?: Tab; onClose(): void }) {
  const [tab, setTab] = useState<Tab>(initial), [item, setItem] = useState<string | null>(null);
  const reached = nextLevel(game), top = highestCleared(game);
  const go = (open: () => void) => { onClose(); open(); };
  return <GameSheet title="Books" subtitle="Recipes, pantry labels and your regulars" art="dish-beehoon" onClose={onClose}>
    <Seg<Tab> label="Books" value={tab} onChange={t => { setTab(t); setItem(null); }} options={[["recipes", "Recipes"], ["pantry", "Pantry"], ["regulars", "Regulars"]] as [Tab, string][]} />
    {tab === "recipes" && Object.entries(FIRST.dish).sort((a, b) => a[1] - b[1]).map(([id, n]) => {
      const d = DISHES[id], got = cleared(game, n), recipe = got ? cookRecipeId(id) : null, term = got ? nearbyTerm(id) : null;
      return <Section key={id}><View style={s.row}><Art k={d.art} size={64} style={!got && n > reached ? { opacity: 0.35 } : undefined} />
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }}>{n > reached ? "???" : d.name}</T>
          <T variant="small" muted>{got ? "Learned in Level " + n : "Learn it in Level " + n}</T>
          {got && <T variant="small">{d.remember}</T>}</View></View>
        {(recipe || term) && <View style={s.links}>
          {recipe && <Chip compact icon="restaurant-outline" label="Cook it for real" onPress={() => go(() => openRecipe(recipe))} />}
          {term && <Chip compact icon="location-outline" label="Find it nearby" onPress={() => go(() => openNearby(term))} />}
        </View>}
      </Section>;
    })}
    {tab === "pantry" && !item && <>
      <T variant="small" muted>Game labels are fictional. Real products vary, so always read the actual label.</T>
      <Grid>{Object.entries(FIRST.item).sort((a, b) => a[1] - b[1]).map(([id, n]) => <PantryCard key={id} id={id} got={n <= reached} onPress={() => setItem(id)} />)}</Grid></>}
    {tab === "pantry" && item && <PantryPage id={item} game={game} onBack={() => setItem(null)} go={go} />}
    {tab === "regulars" && Object.entries(FIRST.guest).sort((a, b) => a[1] - b[1]).map(([id, n]) => {
      const g = GUESTS[id], met = n <= top;
      const notes = g.notes.filter((_, i) => top >= n + i * 3);
      return <Section key={id}><View style={s.row}><Art k={g.art} size={56} style={!met ? { opacity: 0.35 } : undefined} />
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }}>{met ? g.name : "A new regular"}</T>
          <T variant="small" muted>{met ? (g.rules.length ? g.rules.map(r => RULES[r].chip).join(" · ") : "No food rules") : "You meet them in Level " + n}</T>
          {met && <T variant="small">“{g.quote}”</T>}</View></View>
        {met && notes.map((x, i) => <T key={i} variant="small" muted>• {x}</T>)}
        {met && choicesRule(g.rules) && <View style={s.links}><Chip compact icon="options-outline" label="Set my food choices" onPress={() => go(openFoodChoices)} /></View>}
      </Section>;
    })}
  </GameSheet>;
}

function PantryCard({ id, got, onPress }: { id: string; got: boolean; onPress(): void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), it = ITEMS[id];
  return <Pressable disabled={!got} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled: !got }} accessibilityLabel={got ? itemName(id) : "Not found yet"} {...focusProps}
    style={({ pressed }) => [s.card, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
    <Art k={it.art} size={52} style={!got ? { opacity: 0.3 } : undefined} />
    <T variant="small" style={{ fontWeight: "800", textAlign: "center" }} numberOfLines={2}>{got ? itemName(id) : "???"}</T>
    {got && (it.note || it.label?.flagged) && <T variant="small" muted style={{ fontSize: 11, textAlign: "center" }} numberOfLines={3}>{it.label?.flagged ? "Label lists " + it.label.flagged : it.note}</T>}
  </Pressable>;
}

/** One pantry card (GAME_PLAN §9): what it is, label watch-outs, rules it breaks and the dishes that use it, plus the bridges. */
function PantryPage({ id, game, onBack, go }: { id: string; game: GameProgress; onBack(): void; go(open: () => void): void }) {
  const it = ITEMS[id], rules = breaks(id), term = ingredientTerm(id), aliases = ingredientGuide[id]?.aliases;
  const dishes = [...(FIRST.uses[id] ?? [])].filter(d => cleared(game, FIRST.dish[d])).map(d => DISHES[d].name);
  return <Section>
    <View style={s.links}><Chip compact icon="chevron-back" label="All ingredients" onPress={onBack} /></View>
    <View style={s.row}><Art k={it.art} size={72} />
      <View style={{ flex: 1, gap: 2 }}><T variant="subtitle">{itemName(id)}</T>{!!aliases && <T variant="small" muted>{aliases}</T>}</View></View>
    {!!it.note && <T variant="small">{it.note}</T>}
    {it.label && <T variant="small">Game label: {it.label.ingredients.join(", ")}.{it.label.flagged ? " Watch for " + it.label.flagged + "." : ""}</T>}
    <T variant="small" muted>{it.tags?.includes("animal") ? "Not vegetarian, so it fits no order in this kitchen"
      : rules.length ? "Doesn't fit: " + rules.map(r => RULES[r].chip).join(", ") : "Fits every order in the game"}</T>
    {dishes.length > 0 && <T variant="small" muted>In {dishes.join(", ")}</T>}
    {(term || choicesRule(rules)) && <View style={s.links}>
      {term && <Chip compact icon="book-outline" label="Recipes with this" onPress={() => go(() => openIngredient(term))} />}
      {choicesRule(rules) && <Chip compact icon="options-outline" label="Set my food choices" onPress={() => go(openFoodChoices)} />}
    </View>}
  </Section>;
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { width: "30%", flexGrow: 1, maxWidth: 140, alignItems: "center", gap: 4, padding: 10, borderRadius: 18, borderWidth: 2 },
});
