import { useLocalSearchParams } from "expo-router";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { ActivityIndicator, View } from "react-native";
import { Card, T, common } from "../../components/ui";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { ingredientGuide } from "../../data/ingredient-guide";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePreferences } from "../../state/Preferences";
import { addRecipeToShopping } from "../../utils/shopping";
import { useT } from "../../i18n";
export function IngredientGuideScreen() {
  const { id, servings: chosen } = useLocalSearchParams<{ id: string; servings?: string }>(), { recipe, loading, error, refresh } = usePublishedRecipe(id);
  const state = useRecipeWorkspace(), { setNotice, theme } = usePreferences(), t = useT("cook"), tc = useT("common");
  // Shopping follows the servings chosen on the recipe page; anything invalid falls back to the recipe's own servings.
  const requested = Number(chosen), servings = Number.isInteger(requested) && requested >= 1 && requested <= 99 ? requested : recipe?.servings ?? 1;
  return <Screen title={t("ingredientGuide")}>{!recipe ? loading ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingRecipeLower")} />
    : <EmptyState title={t("recipeUnavailable")} text={error ?? t("chooseAnother")} action={error ? tc("retry") : undefined} onPress={refresh} /> : <>
    {recipe.ingredients.map(i => <Card key={i.id} style={common.stack}><View style={common.row}><T variant="subtitle" style={common.flex}>{i.name}</T><IconButton label={t("addIngredientToShopping", { name: i.name })} icon="add" disabled={!state.readable} onPress={() => { void state.change(w => addRecipeToShopping(w, recipe, servings, [i.id])).then(okay => { if (okay) setNotice({ text: t("addedToShopping") }); }); }} /></View>{ingredientGuide[i.id]?.aliases && <T variant="small" muted>{t("alsoCalled", { aliases: ingredientGuide[i.id].aliases ?? "" })}</T>}<T>{ingredientGuide[i.id]?.role ?? t("noSubstitute")}</T></Card>)}
  </>}</Screen>;
}
