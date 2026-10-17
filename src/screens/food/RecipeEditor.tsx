import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { EmptyState, InfoBox } from "../../components/food/Controls";
import { DraftBasics, DraftIngredients, DraftSteps } from "../../components/recipes/DraftFields";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
export function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace();
  const [photoBusy, setPhotoBusy] = useState(false), [deleting, setDeleting] = useState(false);
  const d = state.workspace.drafts.find(d => d.id === id);
  if (!state.ready || !state.readable || !d) return <Screen title="My Recipe" backTo="/cook/my-recipes"><EmptyState title={!state.ready ? "Opening Recipe" : "Recipe Unavailable"} text="" /></Screen>;
  const props = { draft: d, edit: (patch: Parameters<typeof state.edit>[1]) => { void state.edit(id, patch); }, disabled: !state.readable || photoBusy, onBusy: setPhotoBusy };
  return <Screen title={d.title || "New recipe"} backTo="/cook/my-recipes">
    <T variant="small" muted accessibilityLiveRegion="polite">{state.error ? "Changes need Retry" : state.saving ? "Saving…" : "Saved"}</T>
    {d.status === "ready" && <InfoBox title="Ready To Submit · Not Sent" text="Editing resets publication consent." />}
    <DraftBasics {...props} /><DraftIngredients {...props} /><DraftSteps {...props} />
    <Button label="View & Cook" variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/private-recipe/" + id) as never)} />
    {state.error && <Button label="Retry Save" variant="secondary" disabled={photoBusy || state.saving} onPress={() => void state.retry()} />}
    <CookSection title="Publication"><Button label="Review Publication" variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/recipe-review/" + id) as never)} /></CookSection>
    {deleting ? <InfoBox title="Delete This Recipe?" text="The recipe and its photos will be removed."><Button label="Delete Recipe" disabled={photoBusy || state.saving} onPress={() => { void state.remove(id).then(okay => { if (okay) router.dismissTo("/cook/my-recipes" as never); }); }} /><Button label="Keep Recipe" variant="secondary" onPress={() => setDeleting(false)} /></InfoBox> : <Button label="Delete Draft" variant="link" onPress={() => setDeleting(true)} />}
  </Screen>;
}
