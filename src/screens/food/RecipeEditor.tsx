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
import { useLanguage, useT } from "../../i18n";
export function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace();
  const [photoBusy, setPhotoBusy] = useState(false), [deleting, setDeleting] = useState(false);
  const d = state.workspace.drafts.find(d => d.id === id), status = useMyRecipeStatus(), { setNotice } = usePreferences(), t = useT("cook"), language = useLanguage();
  if (!state.ready || !state.readable || !d) return <Screen title={t("myRecipe")} backTo="/cook?tab=mine"><EmptyState title={!state.ready ? t("openingRecipe") : t("recipeUnavailable")} text="" /></Screen>;
  const mine = status.byDraft.get(d.id);
  // A signed-in member's draft may be shared even before its status loads, so always withdraw it first:
  // nothing stays public without a draft to manage it, and a failed withdrawal keeps the draft.
  const remove = async () => {
    try { if (status.member.member) { await withdrawRecipe(d.id); invalidate("member-recipes", "/api/recipes"); } }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : t("removeFailed"), error: true }); return; }
    if (await state.remove(id)) router.dismissTo("/cook?tab=mine" as never);
  };
  const props = { draft: d, edit: (patch: Parameters<typeof state.edit>[1]) => { void state.edit(id, patch); }, disabled: !state.readable || photoBusy, onBusy: setPhotoBusy };
  return <Screen title={d.title || t("newRecipe")} backTo="/cook?tab=mine">
    <T variant="small" muted accessibilityLiveRegion="polite">{state.error ? t("changesNeedRetry") : state.saving ? t("saving") : t("savedState")}</T>
    {(d.status === "ready" || mine) && <InfoBox title={recipeStatus(d, mine, language)} text={mine ? "" : t("editingResets")} />}
    <DraftBasics {...props} /><DraftIngredients {...props} /><DraftSteps {...props} />
    <Button label={t("viewCook")} variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/private-recipe/" + id) as never)} />
    {state.error && <Button label={t("retrySave")} variant="secondary" disabled={photoBusy || state.saving} onPress={() => void state.retry()} />}
    <CookSection title={t("publication")}><Button label={t("reviewPublication")} variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/recipe-review/" + id) as never)} /></CookSection>
    {deleting ? <InfoBox title={t("deleteThisRecipe")} text={mine ? t("deleteTextShared") : t("deleteText")}><Button label={t("deleteRecipe")} disabled={photoBusy || state.saving} onPress={() => void remove()} /><Button label={t("keepRecipe")} variant="secondary" onPress={() => setDeleting(false)} /></InfoBox> : <Button label={t("deleteDraft")} variant="link" onPress={() => setDeleting(true)} />}
  </Screen>;
}
