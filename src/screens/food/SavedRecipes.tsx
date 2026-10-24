import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, T, common } from "../../components/ui";
import { FirstRunState } from "../../components/BrowseControls";
import { RecipeRow } from "../../components/recipes/RecipeRow";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { useReactions } from "../../hooks/useReactions";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** Cook > Saved: every recipe the member bookmarked, newest first, as the same posts as Recipes. Private drafts live in My recipes. */
export function SavedRecipes({ query }: { query: string }) {
  const { doc } = useFood(), t = useT("cook");
  const ids = doc.saves.filter(item => item.kind === "recipe" && !item.id.startsWith("private-")).sort((a, b) => b.savedAt - a.savedAt).map(item => item.id);
  // Recipes that aren't bundled with the app load one by one, so the list grows ten at a time.
  const [limit, setLimit] = useState(10), shown = ids.slice(0, limit);
  useReactions("recipe", shown);
  if (!ids.length) return <FirstRunState icon="bookmark-outline" title={t("saveFirstTitle")} text={t("saveFirstText")}
    action={{ label: t("browseRecipes"), icon: "grid-outline", onPress: () => router.setParams({ tab: undefined }) }} />;
  return <>
    {shown.map(id => <SavedRecipe key={id} id={id} query={query.trim().toLowerCase()} />)}
    {ids.length > limit && <Button label={t("moreSaved")} variant="secondary" onPress={() => setLimit(limit + 10)} />}
  </>;
}
function SavedRecipe({ id, query }: { id: string; query: string }) {
  const { recipe, loading } = usePublishedRecipe(id), { toggleSave, readable } = useFood(), { theme } = usePreferences(), t = useT("cook"), tc = useT("common");
  if (recipe) return !query || recipe.name.toLowerCase().includes(query)
    ? <RecipeRow recipe={recipe} onPress={() => router.push("/cook/recipe/" + id as never)} /> : null;
  if (query) return null;
  return <View style={[common.row, s.missing, { backgroundColor: theme.card, borderColor: theme.border }]}>
    {loading ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingSaved")} /> : <>
      <T muted style={common.flex}>{t("noLongerAvailable")}</T>
      <Button label={tc("remove")} variant="link" disabled={!readable} onPress={() => void toggleSave("recipe", id)} />
    </>}
  </View>;
}
const s = StyleSheet.create({ missing: { minHeight: 64, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, gap: 8, justifyContent: "center" } });
