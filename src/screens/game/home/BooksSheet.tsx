import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, T } from "../../../components/ui";
import { recipeById } from "../../../data/recipes";
import { DISHES } from "../../../game/content/dishes";
import { GUESTS, RULES } from "../../../game/content/guests";
import { ITEMS, itemName } from "../../../game/content/items";
import { LEVELS } from "../../../game/content/levels";
import { cleared, highestCleared, nextLevel, type GameProgress } from "../../../game/progress";
import { GameSheet, Section } from "./GameSheet";
import { Art, Grid, Seg } from "./bits";

type Tab = "recipes" | "pantry" | "regulars";
/** First level in which each dish, ingredient and regular appears. */
function firsts() {
  const dish: Record<string, number> = {}, item: Record<string, number> = {}, guest: Record<string, number> = {};
  for (const lv of LEVELS) for (const o of lv.orders) {
    guest[o.guest] ??= lv.n;
    if (o.dish === "*") continue;
    dish[o.dish] ??= lv.n;
    DISHES[o.dish].parts.forEach(p => p.stages.forEach(st => st.slots.forEach(sl => sl.accepts.forEach(a => { item[a] ??= lv.n; }))));
  }
  return { dish, item, guest };
}
const FIRST = firsts();

export function BooksSheet({ game, initial = "recipes", onClose }: { game: GameProgress; initial?: Tab; onClose(): void }) {
  const [tab, setTab] = useState<Tab>(initial);
  const reached = nextLevel(game), top = highestCleared(game);
  return <GameSheet title="Books" onClose={onClose}>
    <Seg<Tab> label="Books" value={tab} onChange={setTab} options={[["recipes", "Recipes"], ["pantry", "Pantry"], ["regulars", "Regulars"]] as [Tab, string][]} />
    {tab === "recipes" && Object.entries(FIRST.dish).sort((a, b) => a[1] - b[1]).map(([id, n]) => {
      const d = DISHES[id], got = cleared(game, n), recipe = d.recipeId && recipeById(d.recipeId);
      return <Section key={id}><View style={s.row}><Art k={d.art} size={64} style={!got && n > reached ? { opacity: 0.35 } : undefined} />
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }}>{n > reached ? "???" : d.name}</T>
          <T variant="small" muted>{got ? "Learned in Level " + n : "Learn it in Level " + n}</T>
          {got && <T variant="small">{d.remember}</T>}</View></View>
        {got && recipe && <Button variant="secondary" label="Cook it for real" onPress={() => { onClose(); router.push({ pathname: "/cook/recipe/[id]", params: { id: recipe.id } }); }} />}
      </Section>;
    })}
    {tab === "pantry" && <>
      <T variant="small" muted>Game labels are fictional. Real products vary, so always read the actual label.</T>
      <Grid>{Object.entries(FIRST.item).sort((a, b) => a[1] - b[1]).map(([id, n]) => {
        const it = ITEMS[id], got = n <= reached;
        return <View key={id} style={s.card}><Art k={it.art} size={52} style={!got ? { opacity: 0.3 } : undefined} />
          <T variant="small" style={{ fontWeight: "800", textAlign: "center" }} numberOfLines={2}>{got ? itemName(id) : "???"}</T>
          {got && (it.note || it.label?.flagged) && <T variant="small" muted style={{ fontSize: 11, textAlign: "center" }} numberOfLines={3}>{it.label?.flagged ? "Label lists " + it.label.flagged : it.note}</T>}
        </View>;
      })}</Grid></>}
    {tab === "regulars" && Object.entries(FIRST.guest).sort((a, b) => a[1] - b[1]).map(([id, n]) => {
      const g = GUESTS[id], met = n <= top;
      const notes = g.notes.filter((_, i) => top >= n + i * 3);
      return <Section key={id}><View style={s.row}><Art k={g.art} size={56} style={!met ? { opacity: 0.35 } : undefined} />
        <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: "800" }}>{met ? g.name : "A new regular"}</T>
          <T variant="small" muted>{met ? (g.rules.length ? g.rules.map(r => RULES[r].chip).join(" · ") : "No food rules") : "You meet them in Level " + n}</T>
          {met && <T variant="small">“{g.quote}”</T>}</View></View>
        {met && notes.map((x, i) => <T key={i} variant="small" muted>• {x}</T>)}
      </Section>;
    })}
  </GameSheet>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  card: { width: "30%", flexGrow: 1, maxWidth: 140, alignItems: "center", gap: 4, padding: 8, borderRadius: 14 },
});
