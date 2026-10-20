import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { PrivateRecipeContent } from "../../components/recipes/PrivateRecipeContent";
import { EmptyState, InfoBox } from "../../components/food/Controls";
import { IngredientCheck } from "../../components/market/Ingredients";
import { Confirm } from "../../components/Actions";
import { ensureMember } from "../../components/CommunityGate";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { publicationIssue } from "../../state/recipe-workspace";
import { recipeStatus, submitRecipe, withdrawRecipe } from "../../services/member-recipes";

export function RecipeReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace(), d = state.workspace.drafts.find(d => d.id === id);
  const status = useMyRecipeStatus(), { setNotice } = usePreferences(), [busy, setBusy] = useState(false);
  if (!state.ready || !state.readable || !d) return <Screen title="Publication Review"><EmptyState title="Recipe Unavailable" text="Open a saved private draft to review it." /></Screen>;
  const mine = status.byDraft.get(d.id), issue = publicationIssue(d), locked = state.saving || !!state.error || busy;
  const sent = mine && (mine.state === "review" ? mine.pendingRevision : mine.liveRevision) === d.revision && mine.state !== "declined";
  const links = d.ingredients.filter(i => i.listingId).length;
  const submit = async () => {
    if (!ensureMember(status.member, "/recipe-review/" + id)) return;
    setBusy(true);
    try {
      if (d.status !== "ready" && !await state.prepare(id)) return;
      await submitRecipe(d);
      invalidate("member-recipes:mine");
      setNotice({ text: "Sent for review" });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "The recipe was not sent. Try again.", error: true }); }
    finally { setBusy(false); }
  };
  const label = !mine ? "Submit For Review" : mine.live ? "Submit Update" : mine.state === "declined" ? "Submit Again" : "Submit Changes";
  return <Screen title="Publication Review">
    <InfoBox title={recipeStatus(d, mine)} text={mine?.state === "declined" ? mine.note : ""} />
    <PrivateRecipeContent draft={d} />
    {!!links && <T variant="small" muted>Shop Links · {links}</T>}
    <IngredientCheck label="I Own This Recipe And Have Permission To Use Every Photo" checked={d.rights} disabled={locked} onPress={() => void state.consent(id, "rights", !d.rights)} />
    <IngredientCheck label="I Agree To Content Review And Will Disclose Sponsorship" checked={d.policy} disabled={locked} onPress={() => void state.consent(id, "policy", !d.policy)} />
    {!!issue && <T accessibilityLiveRegion="polite">{issue}</T>}
    {sent ? <Button label={mine?.state === "review" ? "In Review" : "Published"} disabled onPress={() => {}} />
      : <Button label={label} icon="send-outline" loading={busy} disabled={locked || !!issue || !status.member.enabled} onPress={() => void submit()} />}
    {!!mine && <Confirm label="Remove From Cook" link text="Members will no longer see this recipe. Your draft stays on this device." action="Remove From Cook"
      run={async () => { await withdrawRecipe(d.id); invalidate("member-recipes", "/api/recipes"); setNotice({ text: "Removed from Cook" }); return true; }} />}
    <T variant="small" muted>Ingredient claims are the author’s.</T>
  </Screen>;
}
