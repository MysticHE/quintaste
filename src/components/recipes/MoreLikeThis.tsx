import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { knownRecipes } from "../../data/recipes";
import { recipeFit } from "../../utils/recipe-dietary";
import { categoryName } from "../../utils/recipe-browse";
import { SectionTitle } from "../food/Controls";
import { T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { useLanguage, useT } from "../../i18n";

/**
 * Up to four recipes sharing a category with this one that do not clash with the reader's diet, most categories in common first.
 * Drawn from recipes the app already holds (bundled, plus published and member recipes loaded this session), so the recipe page
 * makes no extra requests; withdrawn recipes never show. Nothing shows when there are none.
 */
export function MoreLikeThis({ recipe }: { recipe: Recipe }) {
  const { draft } = usePreferences(), t = useT("cook");
  const shared = (other: Recipe) => other.categories.filter(category => recipe.categories.includes(category)).length;
  const seen = new Set([recipe.id]), similar: Recipe[] = [];
  for (const other of knownRecipes()) {
    if (seen.has(other.id) || other.withdrawal || !shared(other) || recipeFit(other, draft.diets, draft.excluded).fit === "Conflicts") continue;
    seen.add(other.id); similar.push(other);
  }
  similar.sort((a, b) => shared(b) - shared(a));
  if (!similar.length) return null;
  return <View testID="more-like-this" style={s.section}>
    <SectionTitle title={t("moreLikeThis")} />
    {similar.slice(0, 4).map(other => <SimilarRecipe key={other.id} recipe={other} />)}
  </View>;
}
function SimilarRecipe({ recipe }: { recipe: Recipe }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), language = useLanguage(), tc = useT("common");
  const facts = [tc("minutes", { n: recipe.minutes }), recipe.categories[0] ? categoryName(recipe.categories[0], language) : ""].filter(Boolean).join(" · ");
  return <Pressable accessibilityRole="link" accessibilityLabel={recipe.name + ", " + facts} {...focusProps}
    onPress={() => router.push("/cook/recipe/" + recipe.id as never)}
    style={({ pressed }) => [common.row, s.row, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    <RecipeImage recipe={recipe} style={s.thumb} />
    <View style={[common.flex, s.text]}>
      <T style={common.bold} numberOfLines={2}>{recipe.name}</T>
      <T variant="small" muted numberOfLines={1}>{facts}</T>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  section: { gap: 8 },
  row: { gap: 12, minHeight: 64, borderWidth: 2, borderRadius: 14, padding: 2 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  text: { gap: 2, minWidth: 0 },
});
