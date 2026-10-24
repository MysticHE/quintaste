import { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, InfoBox } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { IngredientField, ShoppingAisle } from "../../components/recipes/ShoppingParts";
import { ShoppingRecipePicker, type ListRecipe, type RecipeFilter } from "../../components/recipes/ShoppingRecipePicker";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePreferences } from "../../state/Preferences";
import { recipeById } from "../../data/recipes";
import { cookingRecipeById } from "../../utils/private-recipes";
import { combinedRows, shoppableIngredients, shoppingShareText, type ShoppingRow } from "../../utils/shopping";
import { sameIngredient } from "../../utils/ingredient-library";
import { useLanguage, useT } from "../../i18n";

/**
 * Cook > Shopping: one list grouped by aisle. A dropdown narrows it to one recipe's items, however many recipes are on it;
 * ticked items move into the basket. A private list for the cook's own trip: no stock, price or store claims.
 */
export function ShoppingContent({ query }: { query: string }) {
  const state = useRecipeWorkspace(), { theme } = usePreferences(), [fallback, setFallback] = useState(""), [basketOpen, setBasketOpen] = useState(false);
  const [filter, setFilter] = useState<RecipeFilter>({ kind: "all" });
  const notes = state.workspace.shopping, locked = !state.readable, t = useT("cook"), tc = useT("common"), language = useLanguage();
  // A recipe this device no longer holds (a published recipe after a restart) keeps the name saved with its lines.
  const recipeName = (id: string) => cookingRecipeById(id, state.workspace)?.name || notes.find(note => note.recipeId === id && note.recipeName)?.recipeName || t("removedRecipe");
  const recipes: ListRecipe[] = [...new Set(notes.map(note => note.recipeId).filter(Boolean))].map(id => {
    const found = cookingRecipeById(id, state.workspace), count = notes.filter(note => note.recipeId === id).length, total = found ? shoppableIngredients(found).length : 0;
    return { id, name: recipeName(id), count, total: total >= count ? total : undefined, recipe: recipeById(id) };
  });
  const ownCount = notes.filter(note => !note.recipeId).length;
  const active: RecipeFilter = filter.kind === "own" ? (ownCount ? filter : { kind: "all" }) : filter.kind === "recipe" && recipes.some(recipe => recipe.id === filter.id) ? filter : { kind: "all" };
  const scoped = active.kind === "all" ? notes : notes.filter(note => active.kind === "own" ? !note.recipeId : note.recipeId === active.id);
  // Counts follow the rows on screen, where identical lines from different recipes are merged into one.
  const toBuy = combinedRows(scoped.filter(note => !note.checked), language), bought = combinedRows(scoped.filter(note => note.checked), language).flatMap(section => section.rows);
  const left = toBuy.reduce((sum, section) => sum + section.rows.length, 0), done = bought.length, items = left + done;
  const term = query.trim().toLowerCase(), matches = (row: ShoppingRow) => !term || (row.text + " " + row.name).toLowerCase().includes(term);
  const toGet = toBuy.map(section => ({ ...section, rows: section.rows.filter(matches) })).filter(section => section.rows.length), got = bought.filter(matches);
  const listed = (name: string) => notes.some(note => sameIngredient(note.name ?? note.text, name));
  const toggle = (row: ShoppingRow) => void state.change(w => ({ ...w, shopping: w.shopping.map(note => row.ids.includes(note.id) ? { ...note, checked: !row.checked } : note) }));
  const remove = (ids: string[]) => state.change(w => ({ ...w, shopping: w.shopping.filter(note => !ids.includes(note.id)) }));
  const share = async () => { const message = shoppingShareText(notes, language); try { await Share.share({ message }); } catch { setFallback(message); } };
  return <>
    <IngredientField disabled={locked} busy={state.saving} onList={listed} onAdd={name => { setFilter({ kind: "all" }); return state.shop("", name); }} />
    {!notes.length ? <FirstRunState icon="cart-outline" title={t("shoppingFirstTitle")} text={t("shoppingFirstText")}
      action={{ label: t("browseRecipes"), icon: "restaurant-outline", onPress: () => router.setParams({ tab: undefined }) }} /> : <>
      {!!recipes.length && <ShoppingRecipePicker recipes={recipes} ownCount={ownCount} total={combinedRows(notes, language).reduce((sum, section) => sum + section.rows.length, 0)} value={active} disabled={locked} onChange={setFilter}
        onRemove={id => remove(notes.filter(note => note.recipeId === id).map(note => note.id))} onClear={() => remove(notes.map(note => note.id))} />}
      <View style={s.summary}>
        <View style={[common.row, { gap: 12 }]}>
          <View style={common.flex}>
            <T variant="subtitle" accessibilityLiveRegion="polite">{left ? t("toBuy", { n: left }) : t("allInBasket")}</T>
            {!!done && <T variant="small" muted>{t("boughtProgress", { done, total: items })}</T>}
          </View>
          <IconButton label={t("shareShoppingList")} icon="share-outline" appearance="plain" disabled={!notes.some(note => !note.checked)} onPress={() => void share()} />
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={t("boughtProgress", { done, total: items })} accessibilityValue={{ min: 0, max: items, now: done }}
          style={[s.track, { backgroundColor: theme.muted }]}>
          <View style={[s.fill, { width: `${items ? (done / items) * 100 : 0}%`, backgroundColor: theme.success }]} />
        </View>
      </View>
      {toGet.map(section => <ShoppingAisle key={section.aisle} title={section.title} rows={section.rows} recipeName={recipeName} showRecipes={active.kind === "all" && recipes.length > 1}
        disabled={locked} onToggle={toggle} />)}
      {!toGet.length && (term ? <T muted style={common.center}>{t("nothingMatches", { query: query.trim() })}</T>
        : active.kind !== "all" && <T muted style={common.center}>{t("allBoughtHere")}</T>)}
      {!!got.length && <>
        <View style={common.row}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: basketOpen }} onPress={() => setBasketOpen(!basketOpen)} style={[common.row, common.flex, s.basket]}>
            <Icon name={basketOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
            <T style={common.bold} muted>{t("inBasket", { n: got.length })}</T>
          </Pressable>
          <Button label={tc("clear")} variant="link" disabled={locked} onPress={() => void remove(got.flatMap(row => row.ids))} />
        </View>
        {basketOpen && <ShoppingAisle title="" rows={got} recipeName={recipeName} showRecipes={false} disabled={locked} onToggle={toggle} />}
      </>}
      {!!fallback && <InfoBox title={t("sharingUnavailable")} text={t("copyListText")}><T selectable>{fallback}</T><Button label={tc("close")} variant="link" onPress={() => setFallback("")} /></InfoBox>}
    </>}
  </>;
}
const s = StyleSheet.create({
  summary: { gap: 10, paddingTop: 4 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  basket: { gap: 6, minHeight: 48 },
});
