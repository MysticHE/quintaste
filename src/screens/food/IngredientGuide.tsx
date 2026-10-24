import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { RecipeImage } from "../../components/recipes/RecipeImage";
import { ListGroup } from "../../components/GroupedList";
import { Icon, T, common } from "../../components/ui";
import { Chip, EmptyState } from "../../components/food/Controls";
import { useOnAccent } from "../../components/BrowseControls";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { ingredientGuide } from "../../data/ingredient-guide";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePreferences } from "../../state/Preferences";
import { formatAmount } from "../../utils/food-format";
import { addRecipeToShopping, aisleFor, aisleKeys, aisles, isWater, recipeShoppingState, shoppingLineId } from "../../utils/shopping";
import type { Ingredient } from "../../types/food";
import { useLanguage, useT } from "../../i18n";

/**
 * A recipe's ingredients grouped by aisle, each with its scaled amount and a one-tap toggle on the shopping list.
 * Tips and other names show only for ingredients that have them, so the page never repeats filler text.
 */
export function IngredientGuideScreen() {
  const { id, servings: chosen } = useLocalSearchParams<{ id: string; servings?: string }>(), { recipe, loading, error, refresh } = usePublishedRecipe(id);
  const state = useRecipeWorkspace(), { setNotice, theme } = usePreferences(), t = useT("cook"), tc = useT("common");
  // Shopping follows the servings chosen on the recipe page; anything invalid falls back to the recipe's own servings.
  const requested = Number(chosen), servings = Number.isInteger(requested) && requested >= 1 && requested <= 99 ? requested : recipe?.servings ?? 1;
  if (!recipe) return <Screen title={t("ingredientGuide")}>{loading ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingRecipeLower")} />
    : <EmptyState title={t("recipeUnavailable")} text={error ?? t("chooseAnother")} action={error ? tc("retry") : undefined} onPress={refresh} />}</Screen>;
  const scale = servings / recipe.servings, listed = (itemId: string) => state.workspace.shopping.some(note => note.id === shoppingLineId(recipe.id, itemId));
  // Lines added for other servings count as not done, so the button (then "Update amounts") brings them to the servings chosen now.
  const { missing, stale } = recipeShoppingState(state.workspace.shopping, recipe, servings);
  const sections = aisles.map(aisle => ({ aisle, items: recipe.ingredients.filter(item => aisleFor(item.name) === aisle) })).filter(section => section.items.length);
  const toggle = (itemId: string) => void state.change(w => w.shopping.some(note => note.id === shoppingLineId(recipe.id, itemId))
    ? { ...w, shopping: w.shopping.filter(note => note.id !== shoppingLineId(recipe.id, itemId)) } : addRecipeToShopping(w, recipe, servings, [itemId]));
  const addAll = () => void state.change(w => addRecipeToShopping(w, recipe, servings)).then(okay => { if (okay) setNotice({ text: t("addedToShopping") }); });
  return <Screen title={t("ingredientGuide")}>
    <View style={[common.row, s.head, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <RecipeImage recipe={recipe} style={s.thumb} />
      <View style={[common.flex, { minWidth: 0 }]}>
        <T style={common.bold} numberOfLines={2}>{recipe.name}</T>
        <T variant="small" muted numberOfLines={2}>{t("ingredientsCount", { n: recipe.ingredients.length }) + " · " + t("servingsCount", { n: servings })}</T>
      </View>
      {missing || stale ? <Chip compact icon={missing ? "cart-outline" : "refresh-outline"} label={t(missing ? "addAll" : "updateAmounts")} disabled={!state.readable} onPress={addAll} />
        : <View style={[common.row, s.done]}><Icon name="checkmark-circle" size={18} color={theme.success} /><T variant="small" muted>{t("allOnList")}</T></View>}
    </View>
    {sections.map(section => <ListGroup key={section.aisle} title={t(aisleKeys[section.aisle])} aside={String(section.items.length)} inset={false}>
      {section.items.map(item => <GuideRow key={item.id} item={item} scale={scale} listed={listed(item.id)}
        disabled={!state.readable} onToggle={isWater(item.name) ? undefined : () => toggle(item.id)} />)}
    </ListGroup>)}
  </Screen>;
}
/** Name and amount, then other names and a tip when the guide has them; the round button adds or removes the line. */
function GuideRow({ item, scale, listed, disabled, onToggle }: {
  item: Pick<Ingredient, "id" | "name" | "amount" | "unit">; scale: number; listed: boolean; disabled: boolean; onToggle?: () => void;
}) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), t = useT("cook"), language = useLanguage(), guide = ingredientGuide[item.id];
  const amount = item.amount === null ? t("shoppingToTaste") : [formatAmount(item.amount * scale, item.unit, language).text, item.unit].filter(Boolean).join(" ");
  const tip = guide && (language === "zh" ? guide.zh : guide.role);
  const aliases = (guide?.aliases ?? "").split("·").map(alias => alias.trim()).filter(alias => alias && !item.name.toLowerCase().includes(alias.toLowerCase())).join(" · ");
  return <View style={[common.row, s.row]}>
      <View style={[common.flex, s.text]}>
        <View style={[common.row, s.title]}>
          <T style={[common.bold, common.flex]}>{item.name}</T>
          <T variant="small" style={common.bold} color={theme.mutedForeground}>{amount}</T>
        </View>
        {!!aliases && <T variant="small" muted>{aliases}</T>}
        {!!tip && <View style={[common.row, s.tip]}><Icon name="bulb-outline" size={15} color={theme.accent} /><T variant="small" style={common.flex}>{tip}</T></View>}
      </View>
      {onToggle ? <Pressable accessibilityRole="button" accessibilityState={{ selected: listed, disabled }} disabled={disabled} onPress={onToggle} hitSlop={4}
        accessibilityLabel={t(listed ? "removeIngredientFromShopping" : "addIngredientToShopping", { name: item.name })}
        style={({ pressed }) => [s.toggle, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={[s.circle, { backgroundColor: listed ? theme.success : theme.accentSoft }]}>
          <Icon name={listed ? "checkmark" : "add"} size={18} color={listed ? onAccent : theme.accent} />
        </View>
      </Pressable> : <View style={s.toggle} />}
  </View>;
}
const s = StyleSheet.create({
  head: { gap: 12, padding: 10, borderWidth: 1, borderRadius: 16 },
  thumb: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  done: { gap: 4, paddingRight: 6 },
  row: { gap: 8, minHeight: 56, paddingLeft: 14, paddingRight: 4, paddingVertical: 8, alignItems: "flex-start" },
  text: { gap: 3, minWidth: 0, paddingTop: 8 },
  title: { gap: 10, alignItems: "baseline" },
  tip: { gap: 6, alignItems: "flex-start", paddingTop: 2 },
  toggle: { width: 48, minHeight: 40, alignItems: "center", justifyContent: "center" },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
