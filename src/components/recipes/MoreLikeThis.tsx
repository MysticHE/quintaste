import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { knownRecipes } from "../../data/recipes";
import { recipeFit } from "../../utils/recipe-dietary";
import { categoryName } from "../../utils/recipe-browse";
import { edgeScroll } from "../../theme/layout";
import { SectionTitle } from "../food/Controls";
import { T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { useLanguage, useT } from "../../i18n";

/**
 * Up to six recipes sharing a category with this one that do not clash with the reader's diet, most categories in common first,
 * as a row of photo cards that scrolls to the screen edge. Drawn from recipes the app already holds (bundled, plus published and
 * member recipes loaded this session), so the recipe page makes no extra requests; withdrawn recipes never show. Nothing shows
 * when there are none.
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
  // How far right the row has been seen; cards up to one past it load their photos (the page's own check only follows vertical scrolling).
  const [reach, setReach] = useState(() => Dimensions.get("window").width);
  const reached = (x: number) => setReach(current => Math.max(current, x));
  if (!similar.length) return null;
  return <View testID="more-like-this" style={s.section}>
    <SectionTitle title={t("moreLikeThis")} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={edgeScroll.row} contentContainerStyle={[edgeScroll.content, s.cards]} scrollEventThrottle={100}
      onLayout={event => reached(event.nativeEvent.layout.width)} onScroll={event => reached(event.nativeEvent.contentOffset.x + event.nativeEvent.layoutMeasurement.width)}>
      {similar.slice(0, 6).map((other, index) => <SimilarRecipe key={other.id} recipe={other} load={index * STRIDE < reach + STRIDE} />)}
    </ScrollView>
  </View>;
}
function SimilarRecipe({ recipe, load }: { recipe: Recipe; load: boolean }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), language = useLanguage(), tc = useT("common");
  const facts = [tc("minutes", { n: recipe.minutes }), recipe.categories[0] ? categoryName(recipe.categories[0], language) : ""].filter(Boolean).join(" · ");
  return <Pressable accessibilityRole="link" accessibilityLabel={recipe.name + ", " + facts} {...focusProps}
    onPress={() => router.push("/cook/recipe/" + recipe.id as never)}
    style={({ pressed }) => [s.card, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    <RecipeImage recipe={recipe} load={load} style={[s.photo, { backgroundColor: theme.muted }]} />
    <View style={s.text}>
      <T variant="small" style={common.bold} numberOfLines={2}>{recipe.name}</T>
      <T variant="caption" muted numberOfLines={1}>{facts}</T>
    </View>
  </Pressable>;
}
const CARD = 156, GAP = 12, STRIDE = CARD + GAP;
const s = StyleSheet.create({
  section: { gap: 10 },
  cards: { gap: GAP },
  // A keyboard focus ring draws in the 2-point border, so cards never shift when focused.
  card: { width: CARD, borderWidth: 2, borderRadius: 16, padding: 2, gap: 6 },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12 },
  text: { gap: 2, paddingHorizontal: 2, minHeight: 52 },
});
