import { useLocalSearchParams } from "expo-router";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { PrivateRecipeContent } from "../../components/recipes/PrivateRecipeContent";
import { EmptyState, InfoBox } from "../../components/food/Controls";
import { IngredientCheck } from "../../components/market/Ingredients";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { publicationIssue } from "../../state/recipe-workspace";
export function RecipeReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace(), d = state.workspace.drafts.find(d => d.id === id);
  if (!state.ready || !state.readable || !d) return <Screen title="Publication Review"><EmptyState title="Recipe Unavailable" text="Open a saved private draft to review it." /></Screen>;
  const issue = publicationIssue(d), locked = state.saving || !!state.error;
  return <Screen title="Publication Review">
    <InfoBox title={d.status === "ready" ? "Ready To Submit · Not Sent" : "Not Sent"} text="Saved on this device. Publishing awaits creator approval and review services." />
    <PrivateRecipeContent draft={d} />
    <IngredientCheck label="I Own This Recipe And Have Permission To Use Every Photo" checked={d.rights} disabled={locked} onPress={() => void state.consent(id, "rights", !d.rights)} />
    <IngredientCheck label="I Agree To Vegetarian/Vegan Content Review And Will Disclose Sponsorship" checked={d.policy} disabled={locked} onPress={() => void state.consent(id, "policy", !d.policy)} />
    {!!issue && <T accessibilityLiveRegion="polite">{issue}</T>}
    <Button label={d.status === "ready" ? "Ready · Saved" : "Prepare Submission"} disabled={locked || !!issue || d.status === "ready"} onPress={() => void state.prepare(id)} />
    <T variant="small" muted>Ingredient claims are unreviewed.</T>
  </Screen>;
}
