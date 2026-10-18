import { Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { T } from "../ui";
import { RecipeFit } from "./RecipeOverview";
import { RecipeImage } from "./RecipeImage";
import { RecipeActions } from "./RecipeActions";
import { cookedStats } from "../../utils/recipe-browse";

/**
 * A recipe as a post: the photo leads, then like / share / save with their counts, then the name, the facts and
 * where it stands on diet and the five pungent. Photo and text both open the recipe.
 */
export function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const { doc } = useFood(), { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const cooked = cookedStats(doc.recipes.cooked, recipe.id).count;
  const facts = [recipe.minutes + " min", recipe.categories[0] ?? "", recipe.onePot ? "One pot" : "", recipe.member ? "By " + recipe.author : "", cooked ? "Cooked " + cooked + "×" : ""].filter(Boolean).join(" · ");
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={recipe.name + ", " + facts} accessibilityHint="Opens the recipe" {...focusProps}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <RecipeImage recipe={recipe} large style={s.photo} />
    </Pressable>
    <View style={s.body}>
      <RecipeActions recipe={recipe} />
      <Pressable onPress={onPress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={({ pressed }) => [{ gap: 2, opacity: pressed ? 0.7 : 1 }]}>
        <T variant="subtitle" numberOfLines={2}>{recipe.name}</T>
        <T variant="small" muted numberOfLines={2}>{facts}</T>
      </Pressable>
      <RecipeFit recipe={recipe} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  photo: { width: "100%", aspectRatio: 16 / 10 },
  body: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, gap: 6 },
});
