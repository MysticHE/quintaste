import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, T } from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { ListGroup, ListItem, SwitchRow } from "../../components/GroupedList";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { DietChoice, useSnapChoices, useSnapFailure } from "../../components/recipes/SnapParts";
import { useAskForAlerts } from "../../hooks/useAskForAlerts";
import { useBasics } from "../../hooks/useBasics";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { cookableRecipes, startIngredientsJob, type CookableRecipe } from "../../services/ai-recipes";
import { decodeItems } from "../../utils/my-ingredients";
import { useLanguage, useT } from "../../i18n";

const LATELY = 14 * 86400000;

/**
 * Matching recipes (docs/AI_FOOD_LIBRARY_PLAN.md §7, screen 4): our recipes for the member's items, ready ones first, each a name and
 * one muted line ("Missing ginger · 25 min"); at the bottom, "Create a new one with these" (one AI recipe) with its diet and sharing.
 */
export function CanCookScreen() {
  const member = useMember(), { setNotice } = usePreferences(), t = useT("cook"), language = useLanguage(), { doc } = useFood();
  const askForAlerts = useAskForAlerts(), alive = useRef(true);
  const { items: raw } = useLocalSearchParams<{ items?: string }>();
  const items = useMemo(() => decodeItems(raw), [raw]), { basics, ready } = useBasics(member.userId);
  const { revoke, diet, chooseDiet } = useSnapChoices(member.userId), failed = useSnapFailure(revoke);
  const [creating, setCreating] = useState(false), [share, setShare] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);
  // For signed-in members only: anyone else goes to sign in and comes back to My ingredients.
  const needsSignIn = member.enabled && !member.pending && !member.member;
  useEffect(() => { if (needsSignIn) ensureMember(member, "/cook/ingredients"); }, [needsSignIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const names = items.map(i => i.en), pantry = basics.map(b => b.en);
  // Waits for the saved basics, so the list and Create never use the default ones by mistake.
  const key = member.member && ready && names.length ? "ai-recipes:can-cook:" + JSON.stringify([names, pantry]) : null;
  const found = useRemote(key, signal => {
    // Recently cooked recipes go after the others (the cooked log is on this device).
    const now = Date.now(), recent = doc.recipes.cooked.filter(entry => now - entry.finishedAt < LATELY).map(entry => entry.recipeId);
    return cookableRecipes({ items: names, pantry, recent }, signal).then(r => r.items);
  });
  const create = async () => {
    if (busy || !ready || !names.length) return;
    setBusy(true);
    try {
      await startIngredientsJob({ items: names, pantry, diet, private: !share });
      invalidate("ai-recipes:mine"); invalidate("ai-recipes:status");
      setCreating(false);
      setNotice({ text: t("aiAdded") });
      askForAlerts("recipe");
      router.dismissTo("/cook/ai" as never);
    } catch (error) { failed(error, t("aiStartFailed")); }
    finally { if (alive.current) setBusy(false); }
  };
  const line = (recipe: CookableRecipe) => {
    const time = recipe.minutes ? recipe.minutes + " " + t("minShort") : "";
    const need = recipe.missing.length ? t("canCookNeed", { items: recipe.missing.join(language === "zh" ? "、" : ", ").toLowerCase() }) : "";
    return [need, time].filter(Boolean).join(" · ");
  };

  return <CookLayout title={t("canCookTitle")} backTo="/cook/ingredients">
    <RemoteStatus remote={found} icon="restaurant-outline" returnTo="/cook/ingredients" />
    {found.data && !found.data.length && <T muted>{t("canCookNone")}</T>}
    {!!found.data?.length && <ListGroup>
      {found.data.map(recipe => <ListItem key={recipe.id} title={recipe.name} subtitle={line(recipe) || undefined}
        onPress={() => router.push(("/cook/recipe/" + recipe.id) as never)} />)}
    </ListGroup>}
    {!!names.length && <Button label={t("createWithThese")} icon="sparkles" variant="secondary" onPress={() => setCreating(true)} />}
    <Sheet visible={creating} onClose={() => setCreating(false)} title={t("createWithThese")}>
      <DietChoice value={diet} onChange={chooseDiet} />
      <SwitchRow label={t("snapShare")} value={share} onChange={setShare} />
      <Button label={t("snapCreate")} icon="sparkles" loading={busy} disabled={busy || !ready} onPress={() => void create()} />
    </Sheet>
  </CookLayout>;
}
