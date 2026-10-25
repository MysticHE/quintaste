import { usePreferences } from "../../state/Preferences";
import { usePristineDraft } from "../../hooks/usePristineDraft";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { StepPhoto } from "../../components/recipes/StepPhoto";
import { useState } from "react";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { EmptyState, IconButton, InfoBox, SectionTitle, Servings } from "../../components/food/Controls";
import { RecipeActions, RecipeOverview } from "../../components/recipes/RecipeOverview";
import { IngredientList } from "../../components/recipes/IngredientList";
import { NutritionFacts } from "../../components/recipes/NutritionFacts";
import { PrivateNote } from "../../components/food/DetailParts";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { useFood } from "../../state/Food";
import { labelCheckIds, recipeFit } from "../../utils/recipe-dietary";
import { cookingSessionFor } from "../../utils/private-recipes";
import { useT } from "../../i18n";
import { goBack } from "../../utils/navigation";

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
  </View>}>
    <RecipeOverview key={id} recipe={recipe} shareFallback={shareFallback} clearShareFallback={() => setShareFallback("")} />
    {recipe.withdrawal && <InfoBox title={t("recipeWithdrawn")} text={recipe.withdrawal} />}
    {replace && <InfoBox title={t("startAnother")} text={t("startAnotherText")}>
      <Button label={t("keepCurrent")} variant="link" onPress={() => setReplace(false)} />
    </InfoBox>}
    <View style={[common.row, { gap: 10, flexWrap: "wrap" }]}>
      <Servings compact value={servings} onChange={setServings} />
      <View style={{ flexGrow: 1, flexBasis: 140 }}><Button label={current ? t("resume") : replace ? t("replaceCook") : t("cook")} icon="play-outline"
        disabled={busy || !readable || !!recipe.withdrawal} loading={busy} onPress={() => void start()} /></View>
    </View>
    {servings !== recipe.servings && <View style={{ alignSelf: "flex-start" }}><Button label={t("resetServings")} variant="link" onPress={() => setServings(recipe.servings)} /></View>}
    <SectionTitle title={t("ingredients")} />
    <IngredientList ingredients={recipe.ingredients} scale={servings / recipe.servings} flagged={flagged} />
    <SectionTitle title={t("steps")} />
    {recipe.steps.map((step, index) => <View key={index} style={{ gap: 4, paddingVertical: 6 }}><T style={common.bold}>{/^step \d+$/i.test(step.title.trim()) ? t("stepNumber", { n: index + 1 }) : index + 1 + ". " + step.title}</T><T muted>{step.instruction}</T>
      {!!step.photo && <StepPhoto path={step.photo} label={t("stepLabel", { n: index + 1, title: step.title })} />}
    </View>)}
    <NutritionFacts recipe={recipe} />
    {recipe.adaptationId && <Button label={t("noAlliumVersion")} variant="link" onPress={() => router.push(("/cook/recipe/" + recipe.adaptationId) as never)} />}
    <CookSection title={t("privateNote")}><PrivateNote key={"recipe:" + id} noteKey={"recipe:" + id} /></CookSection>
  </Screen>;
}
