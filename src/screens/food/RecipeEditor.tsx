import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { EmptyState, InfoBox } from "../../components/food/Controls";
import { DraftBasics, DraftIngredients, DraftSteps } from "../../components/recipes/DraftFields";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { recipeStatus, withdrawRecipe } from "../../services/member-recipes";
import { useLanguage, useT } from "../../i18n";
import { goBack } from "../../utils/navigation";
import type { RecipeDraft } from "../../types/recipe-workspace";

const isEmptyDraft = (d: RecipeDraft) => !d.title.trim() && !d.description.trim() && !d.photo
  && d.ingredients.every(i => !i.name.trim()) && d.steps.every(s => !s.title.trim() && !s.instruction.trim());
export function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), state = useRecipeWorkspace();
  const [photoBusy, setPhotoBusy] = useState(false), [deleting, setDeleting] = useState(false);
  const d = state.workspace.drafts.find(d => d.id === id), status = useMyRecipeStatus(), { setNotice } = usePreferences(), t = useT("cook"), language = useLanguage();
  // Unknown server status (still loading for a member) keeps the draft: deleting it could orphan a live copy.
  const local = !status.member.member || (!!status.data && !status.byDraft.get(id));
  const leaving = useRef({ draft: d, remove: state.remove, local });
  useEffect(() => { leaving.current = { draft: d, remove: state.remove, local }; });
  useEffect(() => () => { const { draft, remove, local } = leaving.current; if (draft && local && draft.status === "draft" && isEmptyDraft(draft)) void remove(draft.id); }, []);
  if (!state.ready || !state.readable || !d) return <Screen title={t("myRecipe")} backTo="/cook"><EmptyState title={!state.ready ? t("openingRecipe") : t("recipeUnavailable")} text="" /></Screen>;
  const mine = status.byDraft.get(d.id);
  // A signed-in member's draft may be shared even before its status loads, so always withdraw it first:
  // nothing stays public without a draft to manage it, and a failed withdrawal keeps the draft.
  const remove = async () => {
    try { if (status.member.member) { await withdrawRecipe(d.id); invalidate("member-recipes", "/api/recipes"); } }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : t("removeFailed"), error: true }); return; }
    if (await state.remove(id)) goBack("/cook");
  };
  const props = { draft: d, edit: (patch: Parameters<typeof state.edit>[1]) => { void state.edit(id, patch); }, disabled: !state.readable || photoBusy, onBusy: setPhotoBusy };
  return <Screen title={d.title || t("newRecipe")} backTo="/cook">
    <T variant="small" muted accessibilityLiveRegion="polite">{state.error ? t("changesNeedRetry") : state.saving ? t("saving") : t("savedState")}</T>
    {(d.status === "ready" || mine) && <InfoBox title={recipeStatus(d, mine, language)} text={mine ? "" : t("editingResets")} />}
    <DraftBasics {...props} /><DraftIngredients {...props} /><DraftSteps {...props} />
    {state.error && <Button label={t("retrySave")} variant="secondary" disabled={photoBusy || state.saving} onPress={() => void state.retry()} />}
    <View style={[common.row, { gap: 8, flexWrap: "wrap" }]}>
      <View style={s.action}><Button label={t("viewCook")} variant="secondary" disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/private-recipe/" + id) as never)} /></View>
      <View style={s.action}><Button label={t("reviewPublication")} disabled={photoBusy || state.saving || !!state.error} onPress={() => router.push(("/recipe-review/" + id) as never)} /></View>
    </View>
    {deleting ? <InfoBox title={t("deleteThisRecipe")} text={mine ? t("deleteTextShared") : t("deleteText")}><View style={[common.row, { gap: 8, marginTop: 4 }]}>
      <View style={common.flex}><Button label={t("keepRecipe")} variant="secondary" onPress={() => setDeleting(false)} /></View>
      <View style={common.flex}><Button label={t("deleteRecipe")} disabled={photoBusy || state.saving} onPress={() => void remove()} /></View>
    </View></InfoBox> : <Button label={t("deleteDraft")} variant="link" onPress={() => setDeleting(true)} />}
  </Screen>;
}
const s = StyleSheet.create({ action: { flexGrow: 1, flexBasis: 150 } });
