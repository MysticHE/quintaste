import { useRef, useState } from "react";
import { Share } from "react-native";
import { PrivateNote } from "../../components/food/DetailParts";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout as Screen, CookSection } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { Chip, Chips, EmptyState, InfoBox, Servings } from "../../components/food/Controls";
import { PrivateRecipeContent } from "../../components/recipes/PrivateRecipeContent";
import { useRecipeWorkspace } from "../../hooks/useRecipeWorkspace";
import { usePristineDraft } from "../../hooks/usePristineDraft";
import { usePreferences } from "../../state/Preferences";
import { cookingIssue, cookingSessionFor, privateCookingRecipe, recipeShareText } from "../../utils/private-recipes";
import { addRecipeToShopping } from "../../utils/shopping";
export function PrivateRecipeScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>(), state = useRecipeWorkspace(), { setNotice } = usePreferences();
  const backTo = from === "saved" ? "/saved" : "/cook/my-recipes";
  const d = state.workspace.drafts.find(d => d.id === id);
  const [servings, setServings] = usePristineDraft(state.doc.cooking?.recipeId === id ? state.doc.cooking.servings : d && /^[1-8]$/.test(d.servings) ? +d.servings : 2);
  const [replace, setReplace] = useState(false), [sharing, setSharing] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (!state.ready || !d) return <Screen title="My Recipe" backTo={backTo}><EmptyState title={!state.ready ? "Opening Recipe" : "Recipe Unavailable"} text="Private recipes stay with their collection." /></Screen>;
  const issue = cookingIssue(d), recipe = privateCookingRecipe(d), locked = !state.readable || state.saving || !!state.error || busy;
  const session = state.doc.cooking, current = session?.recipeId === id && session.recipeVersion === d.revision;
  const start = async () => {
    if (locked || issue || lock.current) return;
    if (session && !current && !replace) { setReplace(true); return; }
    lock.current = true; setBusy(true);
    try { if (await state.patchDocument({ cooking: cookingSessionFor(session, id, d.revision, servings) })) router.push(("/cooking/" + id) as never); }
    finally { lock.current = false; setBusy(false); }
  };
  const copy = async () => {
    if (locked || lock.current) return; lock.current = true; setBusy(true);
    try { const next = await state.duplicate(id); if (next) router.push(("/recipe-draft/" + next) as never); }
    finally { lock.current = false; setBusy(false); }
  };
  const shop = async () => {
    const okay = await state.change(w => addRecipeToShopping(w, recipe, servings));
    if (okay) setNotice({ text: "Added " + servings + " servings to Shopping." });
  };
  return <Screen title="My Recipe" backTo={backTo}>
    <Chips><Chip label="Edit" icon="create-outline" disabled={locked} onPress={() => router.push(("/recipe-draft/" + id) as never)} /><Chip label="Copy" icon="copy-outline" disabled={locked} onPress={() => void copy()} /><Chip label="Share" icon="share-outline" onPress={() => setSharing(!sharing)} /></Chips>
    <PrivateRecipeContent draft={d} servings={servings} controls={<><Servings value={servings} onChange={setServings} />{servings !== recipe.servings && <Button label="Original Servings" variant="link" onPress={() => setServings(recipe.servings)} />}    {!!issue && <T accessibilityLiveRegion="polite">{issue}</T>}
    {replace && <InfoBox title="Replace Current Cooking?" text="Your current step will be replaced. Timers keep running."><Button label="Keep Current Cooking" variant="link" onPress={() => setReplace(false)} /></InfoBox>}
    <Button label={current ? "Resume" : replace ? "Replace & Cook" : "Cook"} disabled={locked || !!issue} onPress={() => void start()} />
</>} />
    {sharing && <InfoBox title="Share Recipe Text" text="Photos and private notes are excluded."><T selectable>{recipeShareText(d)}</T><Button label="Open Share Sheet" variant="secondary" onPress={() => void Share.share({ message: recipeShareText(d) }).catch(() => setNotice({ text: "Sharing is unavailable here. Select and copy the recipe text above.", error: true }))} /></InfoBox>}
    <Button label="Add To Shopping" variant="secondary" disabled={locked || !!issue} onPress={() => void shop()} />
    <CookSection title="Private Note"><PrivateNote key={"recipe:" + id} noteKey={"recipe:" + id} /></CookSection>
    <CookSection title="Publication"><Button label="Review Publication" variant="secondary" disabled={locked} onPress={() => router.push(("/recipe-review/" + id) as never)} /></CookSection>
  </Screen>;
}
