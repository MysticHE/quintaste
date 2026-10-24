import { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, InfoBox } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { AddItemField, ShoppingAisle } from "../../components/recipes/ShoppingParts";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePreferences } from "../../state/Preferences";
import { cookingRecipeById } from "../../utils/private-recipes";
import { combinedRows, shoppingShareText, type ShoppingRow } from "../../utils/shopping";
import { useLanguage, useT } from "../../i18n";

/**
 * Cook > Shopping: one list grouped by aisle, each item naming the recipes it is for; ticked items move into the basket.
 * A private list for the cook's own trip: no stock, price or store claims.
 */
export function ShoppingContent({ query }: { query: string }) {
  const state = useRecipeWorkspace(), { theme } = usePreferences(), [fallback, setFallback] = useState(""), [basketOpen, setBasketOpen] = useState(false);
  const notes = state.workspace.shopping, locked = !state.readable, t = useT("cook"), tc = useT("common"), language = useLanguage();
  const recipeName = (id: string) => cookingRecipeById(id, state.workspace)?.name || t("removedRecipe");
  const term = query.trim().toLowerCase(), shown = term ? notes.filter(note => (note.text + " " + (note.name ?? "")).toLowerCase().includes(term)) : notes;
  const toGet = combinedRows(shown.filter(note => !note.checked), language), got = combinedRows(shown.filter(note => note.checked), language).flatMap(section => section.rows);
  const recipes = [...new Set(notes.map(note => note.recipeId).filter(Boolean))];
  const left = notes.filter(note => !note.checked).length;
  const toggle = (row: ShoppingRow) => void state.change(w => ({ ...w, shopping: w.shopping.map(note => row.ids.includes(note.id) ? { ...note, checked: !row.checked } : note) }));
  const remove = (ids: string[]) => void state.change(w => ({ ...w, shopping: w.shopping.filter(note => !ids.includes(note.id)) }));
  const share = async () => { const message = shoppingShareText(notes, language); try { await Share.share({ message }); } catch { setFallback(message); } };
  return <>
    <AddItemField disabled={locked} busy={state.saving} onAdd={text => state.shop("", text)} />
    {!notes.length ? <FirstRunState icon="cart-outline" title={t("shoppingFirstTitle")} text={t("shoppingFirstText")}
      action={{ label: t("browseRecipes"), icon: "restaurant-outline", onPress: () => router.setParams({ tab: undefined }) }} /> : <>
      <View style={[common.row, { gap: 10 }]}>
        <View style={common.flex}>
          <T variant="subtitle" accessibilityLiveRegion="polite">{left ? t("itemsToGet", { n: left }) : t("allInBasket")}</T>
          {!!recipes.length && <T variant="small" muted>{t("fromRecipes", { n: recipes.length })}</T>}
        </View>
        <IconButton label={t("shareShoppingList")} icon="share-outline" disabled={!left} onPress={() => void share()} />
      </View>
      {!!recipes.length && <View style={s.recipes}>{recipes.map(id => <RecipeChip key={id} name={recipeName(id)} disabled={locked}
        onRemove={() => remove(notes.filter(note => note.recipeId === id).map(note => note.id))} />)}</View>}
      {toGet.map(section => <ShoppingAisle key={section.aisle} title={section.title} rows={section.rows} recipeName={recipeName} disabled={locked} onToggle={toggle} />)}
      {!toGet.length && !!term && <T muted style={common.center}>{t("nothingMatches", { query: query.trim() })}</T>}
      {!!got.length && <>
        <View style={common.row}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: basketOpen }} onPress={() => setBasketOpen(!basketOpen)} style={[common.row, common.flex, s.basket]}>
            <Icon name={basketOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
            <T style={common.bold} muted>{t("inBasket", { n: got.length })}</T>
          </Pressable>
          <Button label={tc("clear")} variant="link" disabled={locked} onPress={() => remove(got.flatMap(row => row.ids))} />
        </View>
        {basketOpen && <ShoppingAisle title="" rows={got} recipeName={recipeName} disabled={locked} onToggle={toggle} />}
      </>}
      {!!fallback && <InfoBox title={t("sharingUnavailable")} text={t("copyListText")}><T selectable>{fallback}</T><Button label={tc("close")} variant="link" onPress={() => setFallback("")} /></InfoBox>}
    </>}
  </>;
}
/** A recipe on the list; the cross takes all of its items off. */
function RecipeChip({ name, disabled, onRemove }: { name: string; disabled: boolean; onRemove: () => void }) {
  const { theme } = usePreferences(), t = useT("cook");
  return <View style={[common.row, s.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <T variant="small" style={common.bold} numberOfLines={1}>{name}</T>
    <Pressable accessibilityRole="button" accessibilityLabel={t("removeRecipeItems", { name })} disabled={disabled} onPress={onRemove} hitSlop={8}
      style={[s.remove, { backgroundColor: theme.muted }]}><Icon name="close" size={14} color={theme.mutedForeground} /></Pressable>
  </View>;
}
const s = StyleSheet.create({
  recipes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { gap: 6, borderWidth: 1, borderRadius: 18, paddingLeft: 12, paddingRight: 5, minHeight: 36, maxWidth: "100%" },
  remove: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  basket: { gap: 6, minHeight: 48 },
});
