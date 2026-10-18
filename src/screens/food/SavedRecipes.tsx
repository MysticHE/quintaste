import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, T, common } from "../../components/ui";
import { FirstRunState } from "../../components/BrowseControls";
import { RecipeRow } from "../../components/recipes/RecipeRow";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { useReactions } from "../../hooks/useReactions";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

/** Cook > Saved: every recipe the member bookmarked, newest first, as the same posts as Recipes. Private drafts live in My recipes. */
export function SavedRecipes({ query }: { query: string }) {
  const { doc } = useFood();
  const ids = doc.saves.filter(item => item.kind === "recipe" && !item.id.startsWith("private-")).sort((a, b) => b.savedAt - a.savedAt).map(item => item.id);
  useReactions("recipe", ids);
  if (!ids.length) return <FirstRunState icon="bookmark-outline" title="Save recipes you like" text="Tap the bookmark on any recipe to keep it here."
    action={{ label: "Browse Recipes", icon: "grid-outline", onPress: () => router.setParams({ tab: undefined }) }} />;
  return <>{ids.map(id => <SavedRecipe key={id} id={id} query={query.trim().toLowerCase()} />)}</>;
}
function SavedRecipe({ id, query }: { id: string; query: string }) {
  const { recipe, loading } = usePublishedRecipe(id), { toggleSave, readable } = useFood(), { theme } = usePreferences();
  if (recipe) return !query || recipe.name.toLowerCase().includes(query)
    ? <RecipeRow recipe={recipe} onPress={() => router.push("/cook/recipe/" + id as never)} /> : null;
  if (query) return null;
  return <View style={[common.row, s.missing, { backgroundColor: theme.card, borderColor: theme.border }]}>
    {loading ? <ActivityIndicator color={theme.accent} accessibilityLabel="Loading saved recipe" /> : <>
      <T muted style={common.flex}>This recipe is no longer available.</T>
      <Button label="Remove" variant="link" disabled={!readable} onPress={() => void toggleSave("recipe", id)} />
    </>}
  </View>;
}
const s = StyleSheet.create({ missing: { minHeight: 64, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, gap: 8, justifyContent: "center" } });
