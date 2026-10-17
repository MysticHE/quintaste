import { useRef, useState } from "react";
import { Share } from "react-native";
import { router } from "expo-router";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { FloatingAddButton } from "../../components/FloatingAddButton";
import { Chip, Chips, EmptyState, InfoBox, SearchField } from "../../components/food/Controls";
import { Button, T } from "../../components/ui";
import { LinkRow } from "../../components/LinkRow";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { recipesExportText } from "../../utils/recipe-export";
export function MyRecipesScreen() {
  const { workspace, create, ready, readable } = useRecipeWorkspace(), [query, setQuery] = useState(""), [fallback, setFallback] = useState("");
  const lock = useRef(false);
  const add = async () => { if (lock.current || !readable) return; lock.current = true; try { const id = await create(); if (id) router.push(("/recipe-draft/" + id) as never); } finally { lock.current = false; } };
  const exportAll = async () => { const message = recipesExportText(workspace.drafts); try { await Share.share({ message }); } catch { setFallback(message); } };
  const drafts = workspace.drafts.filter(d => (d.title + " " + d.description).toLowerCase().includes(query.trim().toLowerCase()));
  return <Screen title="My Recipes" backTo="/cook" floatingAction={readable ? <FloatingAddButton label="Create Recipe" onPress={() => void add()} /> : undefined}>
    <SearchField value={query} onChange={setQuery} placeholder="Search my recipes" />
    {!ready || !readable ? <EmptyState title="Opening Recipes" text="" /> : <>
      {!!workspace.drafts.length && <Chips><Chip label="Export My Recipes" icon="share-outline" onPress={() => void exportAll()} /></Chips>}
      {!!fallback && <InfoBox title="Sharing Unavailable" text="Select and copy your recipes. Photos are not included."><T selectable>{fallback}</T><Button label="Close" variant="link" onPress={() => setFallback("")} /></InfoBox>}
      {!drafts.length && <EmptyState title={query ? "No Matching Recipes" : "No Recipes Yet"} text="" icon="book-outline" />}
      {drafts.map(d => <LinkRow key={d.id} label={d.title || "Untitled recipe"} text={(d.status === "ready" ? "Ready to submit · Not sent" : "Private draft")} icon="book-outline" onPress={() => router.push(("/recipe-draft/" + d.id) as never)} />)}
    </>}
  </Screen>;
}
