import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { EmptyState, InfoBox } from "../../components/food/Controls";
import { DraftBasics, DraftIngredients, DraftSteps } from "../../components/recipes/DraftFields";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { recipeStatus, withdrawRecipe } from "../../services/member-recipes";
export function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace();
  const [photoBusy, setPhotoBusy] = useState(false), [deleting, setDeleting] = useState(false);
  const d = state.workspace.drafts.find(d => d.id === id), status = useMyRecipeStatus(), { setNotice } = usePreferences();
  if (!state.ready || !state.readable || !d) return <Screen title="My Recipe" backTo="/cook/my-recipes"><EmptyState title={!state.ready ? "Opening Recipe" : "Recipe Unavailable"} text="" /></Screen>;
  const mine = status.byDraft.get(d.id);
  // A signed-in member's draft may be shared even before its status loads, so always withdraw it first:
  // nothing stays public without a draft to manage it, and a failed withdrawal keeps the draft.
  const remove = async () => {
    try { if (status.member.member) { await withdrawRecipe(d.id); invalidate("member-recipes", "/api/recipes"); } }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "The recipe could not be removed from Cook. Try again.", error: true }); return; }
    if (await state.remove(id)) router.dismissTo("/cook/my-recipes" as never);
  };
  const props = { draft: d, edit: (patch: Parameters<typeof state.edit>[1]) => { void state.edit(id, patch); }, disabled: !state.readable || photoBusy, onBusy: setPhotoBusy };
  return <Screen title={d.title || "New recipe"} backTo="/cook/my-recipes">
    <T variant="small" muted accessibilityLiveRegion="polite">{state.error ? "Changes need Retry" : state.saving ? "Saving…" : "Saved"}</T>
    {(d.status === "ready" || mine) && <InfoBox title={recipeStatus(d, mine)} text={mine ? "" : "Editing resets publication consent."} />}
    <DraftBasics {...props} /><DraftIngredients {...props} /><DraftSteps {...props} />
    <Button label="View & Cook" variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/private-recipe/" + id) as never)} />
    {state.error && <Button label="Retry Save" variant="secondary" disabled={photoBusy || state.saving} onPress={() => void state.retry()} />}
    <CookSection title="Publication"><Button label="Review Publication" variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/recipe-review/" + id) as never)} /></CookSection>
    {deleting ? <InfoBox title="Delete This Recipe?" text={mine ? "The recipe and its photos will be removed, including from Cook." : "The recipe and its photos will be removed."}><Button label="Delete Recipe" disabled={photoBusy || state.saving} onPress={() => void remove()} /><Button label="Keep Recipe" variant="secondary" onPress={() => setDeleting(false)} /></InfoBox> : <Button label="Delete Draft" variant="link" onPress={() => setDeleting(true)} />}
  </Screen>;
}
