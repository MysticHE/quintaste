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
import { SwapSheet } from "../../components/recipes/SwapSheet";
import { useRecipeSwaps } from "../../hooks/useRecipeSwaps";
import { recipeLanguage } from "../../utils/swaps";
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
import type { Recipe } from "../../types/food";

/**
 * A recipe: photo and facts, ingredients for the chosen servings, the method with step check-off and timers, nutrition, members'
 * cooked photos and similar recipes. Servings and Cook stay pinned at the bottom (owner, 28 Oct 2026). Ingredient swaps the member
 * chose show in the list, the steps, the labels and the figures; after cooking with them the bar asks once whether they worked.
 */
export function RecipeDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { draft, setNotice } = usePreferences(), t = useT("cook"), tc = useT("common");
  const { recipe, loading, error, refresh } = usePublishedRecipe(id), { doc, patchDocument, readable } = useFood();
  const [servings, setServings] = usePristineDraft(doc.cooking?.recipeId === id ? doc.cooking.servings : recipe?.servings ?? 2);
  const [replace, setReplace] = useState(false), [busy, setBusy] = useState(false), [shareFallback, setShareFallback] = useState("");
  const swaps = useRecipeSwaps(recipe), [swapping, setSwapping] = useState<string | null>(null), [answering, setAnswering] = useState(false);
  if (!recipe) return <Screen title={loading ? t("loadingRecipe") : t("recipeUnavailable")}><EmptyState title={loading ? t("loadingRecipe") : t("thisRecipeUnavailable")} text={error ?? t("notesRemain")} action={error ? tc("retry") : undefined} onPress={refresh} /></Screen>;
  const current = doc.cooking?.recipeId === id && (doc.cooking.recipeVersion ?? 1) === recipe.revision;
  const shown: Recipe = swaps.swapped ?? recipe, scale = servings / recipe.servings;
  const flagged = labelCheckIds(shown, recipeFit(shown, draft.diets, draft.excluded).unknown);
  const swapLine = swapping ? swaps.lines.get(swapping) ?? null : null;
  const answer = async (worked: boolean) => {
    setAnswering(true);
    try { await swaps.answer(worked); if (!worked) setNotice({ text: t("swapThanks") }); }
    catch (problem) { setNotice({ text: problem instanceof Error && problem.message ? problem.message : tc("actionFailed"), error: true }); }
    finally { setAnswering(false); }
  };
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
    label={current ? t("resume") : replace ? t("replaceCook") : t("cook")} onPress={() => void start()} replacing={replace} onKeep={() => setReplace(false)}
    asking={swaps.ask.length} answering={answering} onAnswer={worked => void answer(worked)} />}>
    <RecipeOverview key={id} recipe={shown} shareFallback={shareFallback} clearShareFallback={() => setShareFallback("")} />
    {recipe.withdrawal && <InfoBox title={t("recipeWithdrawn")} text={recipe.withdrawal} />}
    <View style={s.section}>
      <SectionTitle title={t("ingredients")} aside={tc("servingsCount", { n: servings })} />
      <IngredientList ingredients={recipe.ingredients} scale={scale} flagged={flagged}
        swaps={swaps.list(setSwapping)} />
      {servings !== recipe.servings && <View style={s.start}><Button label={t("resetServings")} variant="link" onPress={() => setServings(recipe.servings)} /></View>}
    </View>
    <View style={s.section}>
      <SectionTitle title={t("steps")} />
      <RecipeSteps recipe={shown} />
    </View>
    <NutritionFacts recipe={shown} />
    {recipe.adaptationId && <View style={s.start}><Button label={t("noAlliumVersion")} variant="link" onPress={() => router.push(("/cook/recipe/" + recipe.adaptationId) as never)} /></View>}
    <CookedPhotos recipeId={recipe.id} />
    <MoreLikeThis recipe={recipe} />
    <CookSection title={t("privateNote")}><PrivateNote key={"recipe:" + id} noteKey={"recipe:" + id} /></CookSection>
    <SwapSheet line={swapLine} aiFor={swaps.ai} original={recipe.ingredients.find(item => item.id === swapping)?.name ?? ""} scale={scale} language={recipeLanguage(recipe)}
      onClose={() => setSwapping(null)} onChoose={option => { if (swapLine) swaps.choose(swapLine, option); setSwapping(null); }} />
  </Screen>;
}
/**
 * Servings and Cook (or Resume), pinned above the bottom edge so cooking is one tap from anywhere on the page. Starting a recipe
 * while another is in progress first asks here, beside the button, so the warning is never scrolled out of view.
 */
function CookBar({ servings, setServings, label, disabled, busy, onPress, replacing, onKeep, asking, answering, onAnswer }: {
  servings: number; setServings: (value: number) => void; label: string; disabled: boolean; busy: boolean; onPress: () => void; replacing: boolean; onKeep: () => void;
  asking: number; answering: boolean; onAnswer: (worked: boolean) => void;
}) {
  const { theme } = usePreferences(), t = useT("cook");
  return <View style={s.dock}><View testID="cook-bar" style={[s.bar, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
    {replacing && <View testID="replace-cooking" accessibilityLiveRegion="polite" style={s.warning}>
      <T variant="small" style={common.bold}>{t("startAnother")}</T><T variant="caption" muted>{t("startAnotherText")}</T>
      <View style={s.keep}><Button label={t("keepCurrent")} variant="link" onPress={onKeep} /></View>
    </View>}
    {!replacing && asking > 0 && <View testID="swap-question" accessibilityLiveRegion="polite" style={[common.row, s.question]}>
      <T variant="small" style={[common.bold, common.flex]}>{t("swapWorked", { n: asking })}</T>
      <Button label={t("swapNo")} variant="link" disabled={answering} onPress={() => onAnswer(false)} />
      <Button label={t("swapYes")} variant="link" disabled={answering} onPress={() => onAnswer(true)} />
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
  question: { gap: 4, paddingLeft: 6 },
});
