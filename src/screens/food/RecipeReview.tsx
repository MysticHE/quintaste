import { useEffect, useState } from "react";
import { useAskForAlerts } from "../../hooks/useAskForAlerts";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, Icon, T, common } from "../../components/ui";
import { PrivateRecipeContent } from "../../components/recipes/PrivateRecipeContent";
import { Chip, Chips, EmptyState, InfoBox } from "../../components/food/Controls";
import { IngredientCheck } from "../../components/market/Ingredients";
import { Confirm } from "../../components/Actions";
import { ensureMember } from "../../components/CommunityGate";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { publicationIssueKeys, reviewedDrafts } from "../../state/recipe-workspace";
import { recipeStatus, submitRecipe, withdrawRecipe } from "../../services/member-recipes";
import { useLanguage, useT } from "../../i18n";
import { goBack } from "../../utils/navigation";

export function RecipeReviewScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>(), state = useRecipeWorkspace(), d = state.workspace.drafts.find(d => d.id === id);
  const status = useMyRecipeStatus(), { setNotice, theme } = usePreferences(), [busy, setBusy] = useState(false), t = useT("cook"), tc = useT("common"), tm = useT("me"), language = useLanguage();
  const askForAlerts = useAskForAlerts();
  useEffect(() => { reviewedDrafts.add(id); }, [id]);
  if (!state.ready || !state.readable || !d) return <Screen title={t("publicationReview")}><EmptyState title={t("recipeUnavailable")} text={t("openDraftToReview")} /></Screen>;
  const mine = status.byDraft.get(d.id), issues = publicationIssueKeys(d), locked = state.saving || !!state.error || busy;
  // The consent boxes are on this screen; everything else is fixed in the editor, which marks the same fields.
  const fields = issues.filter(key => key !== "issueRights");
  const edit = () => from === "edit" ? goBack(("/recipe-draft/" + id) as never) : router.push(("/recipe-draft/" + id + "?from=review") as never);
  const sent = mine && (mine.state === "review" ? mine.pendingRevision : mine.liveRevision) === d.revision && mine.state !== "declined";
  const links = d.ingredients.filter(i => i.listingId).length;
  const submit = async () => {
    if (!ensureMember(status.member, "/recipe-review/" + id)) return;
    setBusy(true);
    try {
      if (d.status !== "ready" && !await state.prepare(id)) return;
      await submitRecipe(d);
      invalidate("member-recipes:mine");
      setNotice({ text: t("sentForReview") });
      askForAlerts("recipe");
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : t("notSent"), error: true }); }
    finally { setBusy(false); }
  };
  const label = t(!mine ? "submitForReview" : mine.live ? "submitUpdate" : mine.state === "declined" ? "submitAgain" : "submitChanges");
  return <Screen title={t("publicationReview")}>
    <Chips><Chip label={tc("edit")} icon="create-outline" disabled={locked} onPress={edit} /></Chips>
    <InfoBox title={recipeStatus(d, mine, language)} text={mine?.state === "declined" ? mine.note : ""}>
      {fields.map(key => <View key={key} style={[common.row, { gap: 8, alignItems: "flex-start" }]}>
        <Icon name="alert-circle-outline" size={18} color={theme.error} /><T variant="small" style={common.flex}>{tm(key)}</T>
      </View>)}
    </InfoBox>
    <PrivateRecipeContent draft={d} />
    {!!links && <T variant="small" muted>{t("shopLinksCount", { n: links })}</T>}
    <IngredientCheck label={t("consentRights")} checked={d.rights} disabled={locked} onPress={() => void state.consent(id, "rights", !d.rights)} />
    <IngredientCheck label={t("consentPolicy")} checked={d.policy} disabled={locked} onPress={() => void state.consent(id, "policy", !d.policy)} />
    {!fields.length && issues.includes("issueRights") && <T accessibilityLiveRegion="polite">{tm("issueRights")}</T>}
    {sent ? <Button label={mine?.state === "review" ? t("inReview") : t("published")} disabled onPress={() => {}} />
      : <Button label={label} icon="send-outline" loading={busy} disabled={locked || !!issues.length || !status.member.enabled} onPress={() => void submit()} />}
    {!!mine && <Confirm label={t("removeFromCook")} link text={t("removeFromCookText")} action={t("removeFromCook")}
      run={async () => { await withdrawRecipe(d.id); invalidate("member-recipes", "/api/recipes"); setNotice({ text: t("removedFromCook") }); return true; }} />}
    <T variant="small" muted>{t("claimsAuthors")}</T>
  </Screen>;
}
