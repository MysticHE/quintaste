import { usePreferences } from "../../state/Preferences";
import { usePristineDraft } from "../../hooks/usePristineDraft";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useState } from "react";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { EmptyState, IconButton, InfoBox, SectionTitle, Servings } from "../../components/food/Controls";
import { RecipeActions, RecipeOverview } from "../../components/recipes/RecipeOverview";
import { IngredientList } from "../../components/recipes/IngredientList";
import { RecipeSteps } from "../../components/recipes/RecipeSteps";
import { NutritionFacts } from "../../components/recipes/NutritionFacts";
import { CookedPhotos } from "../../components/recipes/CookedPhotos";
import { MoreLikeThis } from "../../components/recipes/MoreLikeThis";
import { PrivateNote } from "../../components/food/DetailParts";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { useFood } from "../../state/Food";
import { labelCheckIds, recipeFit } from "../../utils/recipe-dietary";
import { cookingSessionFor } from "../../utils/private-recipes";
import { SCREEN_GUTTER } from "../../theme/layout";
import { useT } from "../../i18n";
import { goBack } from "../../utils/navigation";

/**
 * A recipe: photo and facts, ingredients for the chosen servings, the method with step check-off and timers, nutrition, members'
 * cooked photos and similar recipes. Servings and Cook stay pinned at the bottom (owner, 28 Oct 2026).
 */
export function RecipeDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { draft } = usePreferences(), t = useT("cook"), tc = useT("common");
  const { recipe, loading, error, refresh } = usePublishedRecipe(id), { doc, patchDocument, readable } = useFood();
  const [servings, setServings] = usePristineDraft(doc.cooking?.recipeId === id ? doc.cooking.servings : recipe?.servings ?? 2);
  const [replace, setReplace] = useState(false), [busy, setBusy] = useState(false), [shareFallback, setShareFallback] = useState("");
  if (!recipe) return <Screen title={loading ? t("loadingRecipe") : t("recipeUnavailable")}><EmptyState title={loading ? t("loadingRecipe") : t("thisRecipeUnavailable")} text={error ?? t("notesRemain")} action={error ? tc("retry") : undefined} onPress={refresh} /></Screen>;
  const current = doc.cooking?.recipeId === id && (doc.cooking.recipeVersion ?? 1) === recipe.revision;
  const flagged = labelCheckIds(recipe, recipeFit(recipe, draft.diets, draft.excluded).unknown);
  const start = async () => {
    if (recipe.withdrawal) return;
    if (doc.cooking && !current && !replace) { setReplace(true); return; }
    setBusy(true);
    try {
      if (await patchDocument({ cooking: cookingSessionFor(doc.cooking, id, recipe.revision, servings) })) router.push("/cooking/" + id as never);
    } finally { setBusy(false); }
  };
  return <Screen title={recipe.name} header={<View style={common.row}>
    <IconButton appearance="plain" label={tc("goBack")} icon="chevron-back" onPress={() => goBack(from === "saved" ? "/saved" : "/cook")} />
    <View style={common.flex} />
    <RecipeActions key={id} recipe={recipe} onShareFailed={setShareFallback} />
  </View>} floatingAction={<CookBar servings={servings} setServings={setServings} disabled={busy || !readable || !!recipe.withdrawal} busy={busy}
    label={current ? t("resume") : replace ? t("replaceCook") : t("cook")} onPress={() => void start()} replacing={replace} onKeep={() => setReplace(false)} />}>
    <RecipeOverview key={id} recipe={recipe} shareFallback={shareFallback} clearShareFallback={() => setShareFallback("")} />
    {recipe.withdrawal && <InfoBox title={t("recipeWithdrawn")} text={recipe.withdrawal} />}
    <View style={s.section}>
      <SectionTitle title={t("ingredients")} aside={tc("servingsCount", { n: servings })} />
      <IngredientList ingredients={recipe.ingredients} scale={servings / recipe.servings} flagged={flagged} />
      {servings !== recipe.servings && <View style={s.start}><Button label={t("resetServings")} variant="link" onPress={() => setServings(recipe.servings)} /></View>}
    </View>
    <View style={s.section}>
      <SectionTitle title={t("steps")} />
      <RecipeSteps recipe={recipe} />
    </View>
    <NutritionFacts recipe={recipe} />
    {recipe.adaptationId && <View style={s.start}><Button label={t("noAlliumVersion")} variant="link" onPress={() => router.push(("/cook/recipe/" + recipe.adaptationId) as never)} /></View>}
    <CookedPhotos recipeId={recipe.id} />
    <MoreLikeThis recipe={recipe} />
    <CookSection title={t("privateNote")}><PrivateNote key={"recipe:" + id} noteKey={"recipe:" + id} /></CookSection>
  </Screen>;
}
/**
 * Servings and Cook (or Resume), pinned above the bottom edge so cooking is one tap from anywhere on the page. Starting a recipe
 * while another is in progress first asks here, beside the button, so the warning is never scrolled out of view.
 */
function CookBar({ servings, setServings, label, disabled, busy, onPress, replacing, onKeep }: {
  servings: number; setServings: (value: number) => void; label: string; disabled: boolean; busy: boolean; onPress: () => void; replacing: boolean; onKeep: () => void;
}) {
  const { theme } = usePreferences(), t = useT("cook");
  return <View style={s.dock}><View testID="cook-bar" style={[s.bar, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
    {replacing && <View testID="replace-cooking" accessibilityLiveRegion="polite" style={s.warning}>
      <T variant="small" style={common.bold}>{t("startAnother")}</T><T variant="caption" muted>{t("startAnotherText")}</T>
      <View style={s.keep}><Button label={t("keepCurrent")} variant="link" onPress={onKeep} /></View>
    </View>}
    <View style={[common.row, s.controls]}>
      <Servings compact value={servings} onChange={setServings} />
      <View style={common.flex}><Button label={label} icon="play-outline" disabled={disabled} loading={busy} onPress={onPress} /></View>
    </View>
  </View></View>;
}
const s = StyleSheet.create({
  section: { gap: 10 },
  start: { alignSelf: "flex-start" },
  dock: { alignSelf: "stretch", alignItems: "center", paddingHorizontal: SCREEN_GUTTER },
  bar: { width: "100%", maxWidth: 560, gap: 6, padding: 8, borderWidth: 1, borderRadius: 18,
    shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  controls: { gap: 10 },
  warning: { gap: 2, paddingHorizontal: 6, paddingTop: 2 },
  keep: { alignSelf: "flex-start", marginLeft: -6 },
});
