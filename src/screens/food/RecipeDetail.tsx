import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePreferences } from "../../state/Preferences";
import { usePristineDraft } from "../../hooks/usePristineDraft";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { StepPhoto } from "../../components/recipes/StepPhoto";
import { useState } from "react";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { Chip, EmptyState, InfoBox, SectionTitle, Servings } from "../../components/food/Controls";
import { RecipeOverview } from "../../components/recipes/RecipeOverview";
import { IngredientList } from "../../components/recipes/IngredientList";
import { NutritionFacts } from "../../components/recipes/NutritionFacts";
import { PrivateNote } from "../../components/food/DetailParts";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { useFood } from "../../state/Food";
import { addRecipeToShopping } from "../../utils/shopping";
import { labelCheckIds, recipeFit } from "../../utils/recipe-dietary";
import { cookingSessionFor } from "../../utils/private-recipes";

export function RecipeDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const workspace = useRecipeWorkspace(), { setNotice, draft } = usePreferences();
  const { recipe, loading, error, refresh } = usePublishedRecipe(id), { doc, patchDocument, readable } = useFood();
  const [servings, setServings] = usePristineDraft(doc.cooking?.recipeId === id ? doc.cooking.servings : recipe?.servings ?? 2);
  const [replace, setReplace] = useState(false), [busy, setBusy] = useState(false);
  if (!recipe) return <Screen title={loading ? "Loading Recipe" : "Recipe Unavailable"}><EmptyState title={loading ? "Loading Recipe" : "This Recipe Is Unavailable"} text={error ?? "Your notes and saves remain on this device."} action={error ? "Retry" : undefined} onPress={refresh} /></Screen>;
  const current = doc.cooking?.recipeId === id && (doc.cooking.recipeVersion ?? 1) === recipe.revision;
  const flagged = labelCheckIds(recipe, recipeFit(recipe, draft.diet, draft.excluded).unknown);
  const start = async () => {
    if (recipe.withdrawal) return;
    if (doc.cooking && !current && !replace) { setReplace(true); return; }
    setBusy(true);
    try {
      if (await patchDocument({ cooking: cookingSessionFor(doc.cooking, id, recipe.revision, servings) })) router.push("/cooking/" + id as never);
    } finally { setBusy(false); }
  };
  const shop = async () => {
    if (await workspace.change(w => addRecipeToShopping(w, recipe, servings))) setNotice({ text: "Added " + servings + " servings to Shopping." });
  };
  return <Screen title={recipe.name} backTo={from === "saved" ? "/saved" : undefined}>
    <RecipeOverview key={id} recipe={recipe} />
    {recipe.withdrawal && <InfoBox title="Recipe Withdrawn" text={recipe.withdrawal} />}
    <View style={{ gap: 8 }}><Servings value={servings} onChange={setServings} />
      {servings !== recipe.servings && <Button label="Reset Servings" variant="link" onPress={() => setServings(recipe.servings)} />}
      {replace && <InfoBox title="Start Another Recipe?" text="Your current step will be replaced. Existing timers will keep running.">
        <Button label="Keep Current Cooking" variant="link" onPress={() => setReplace(false)} />
      </InfoBox>}
      <Button label={current ? "Resume" : replace ? "Replace & Cook" : "Cook"} icon="play-outline"
        disabled={busy || !readable || !!recipe.withdrawal} loading={busy} onPress={() => void start()} />
    </View>
    <T variant="subtitle" accessibilityRole="header">Ingredients</T>
    <View style={[common.row, { gap: 8 }]}>
      <Chip compact label="Add To Shopping List" icon="cart-outline" disabled={!readable} onPress={() => void shop()} />
      <Chip compact label="Ingredient Guide" icon="library-outline" onPress={() => router.push({ pathname: "/cook/ingredients/[id]", params: { id, servings: String(servings) } } as never)} />
    </View>
    <IngredientList ingredients={recipe.ingredients} scale={servings / recipe.servings} flagged={flagged} />
    <SectionTitle title="Steps" />
    {recipe.steps.map((step, index) => <View key={index} style={{ gap: 4, paddingVertical: 6 }}><T style={common.bold}>{/^step \d+$/i.test(step.title.trim()) ? "Step " + (index + 1) : index + 1 + ". " + step.title}</T><T muted>{step.instruction}</T>
      {!!step.photo && <StepPhoto path={step.photo} kind={step.image} label={"Step " + (index + 1) + ": " + step.title} />}
    </View>)}
    <NutritionFacts recipe={recipe} />
    {recipe.adaptationId && <Button label="No-Allium Version" variant="link" onPress={() => router.push(("/cook/recipe/" + recipe.adaptationId) as never)} />}
    <CookSection title="Private Note"><PrivateNote key={"recipe:" + id} noteKey={"recipe:" + id} /></CookSection>
  </Screen>;
}
