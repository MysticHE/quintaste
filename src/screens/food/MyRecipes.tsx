import { useRef, useState } from "react";
import { Share } from "react-native";
import { router } from "expo-router";
import { Chip, Chips, EmptyState, InfoBox } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { Button, T } from "../../components/ui";
import { LinkRow } from "../../components/LinkRow";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { useMyRecipeStatus } from "../../hooks/useMemberRecipes";
import { recipeStatus } from "../../services/member-recipes";
import { recipesExportText } from "../../utils/recipe-export";
import { useLanguage, useT } from "../../i18n";

/** Creates a draft and opens it; a lock stops a double tap creating two. */
export function useCreateRecipe() {
  const { create, readable } = useRecipeWorkspace(), lock = useRef(false);
  return { readable, create: async () => {
    if (lock.current || !readable) return;
    lock.current = true;
    try { const id = await create(); if (id) router.push(("/recipe-draft/" + id) as never); } finally { lock.current = false; }
  } };
}
/** Cook > My recipes: the member's drafts, searched by the shared header. */
export function MyRecipesContent({ query }: { query: string }) {
  const { workspace, ready, readable } = useRecipeWorkspace(), [fallback, setFallback] = useState("");
  const status = useMyRecipeStatus(), { create } = useCreateRecipe(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const exportAll = async () => { const message = recipesExportText(workspace.drafts, language); try { await Share.share({ message }); } catch { setFallback(message); } };
  const drafts = workspace.drafts.filter(d => (d.title + " " + d.description).toLowerCase().includes(query.trim().toLowerCase()));
  if (!ready || !readable) return <EmptyState title={t("openingRecipes")} text="" />;
  if (!workspace.drafts.length) return <FirstRunState icon="book-outline" title={t("firstRecipeTitle")} text={t("firstRecipeText")}
    action={{ label: t("createRecipe"), icon: "add", onPress: () => void create() }} />;
  return <>
    <Chips><Chip label={t("exportMyRecipes")} icon="share-outline" onPress={() => void exportAll()} /></Chips>
    {!!fallback && <InfoBox title={t("sharingUnavailable")} text={t("copyRecipesText")}><T selectable>{fallback}</T><Button label={tc("close")} variant="link" onPress={() => setFallback("")} /></InfoBox>}
    {!drafts.length && <EmptyState title={t("noMatchingRecipes")} text="" icon="book-outline" />}
    {drafts.map(d => <LinkRow key={d.id} label={d.title || t("untitledRecipe")} text={recipeStatus(d, status.byDraft.get(d.id), language)} icon="book-outline" onPress={() => router.push(("/recipe-draft/" + d.id) as never)} />)}
  </>;
}
