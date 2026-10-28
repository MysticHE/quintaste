import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { Image } from "expo-image";
import { StepPhoto } from "../../components/recipes/StepPhoto";
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { EmptyState, IconButton, InfoBox, Servings } from "../../components/food/Controls";
import { GatherList, IngredientSheet, StepChecklist, TimerAlertOffer } from "../../components/recipes/CookingParts";
import { CookTimerBar } from "../../components/recipes/CookTimerBar";
import { TimerSheet } from "../../components/recipes/TimerSheet";
import { cookedLimit } from "../../state/recipe-workspace";
import type { CookingSession } from "../../types/food";
import { TimerCard } from "../../components/food/Timers";
import { StepSwipe, StepTabs } from "../../components/recipes/StepTabs";
import { cookingRecipeById, cookingIssue } from "../../utils/private-recipes";
import { stepIngredientIds } from "../../utils/step-ingredients";
import { TimerAlertControl } from "../../components/food/TimerAlertControl";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** True when the screen could not be kept awake. */
function useCookingAwake(enabled: boolean) {
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    let focused = true;
    const tag = "quintaste-guided-cooking";
    void activateKeepAwakeAsync(tag).then(() => {
      if (!focused) void deactivateKeepAwake(tag).catch(() => {});
    }).catch(() => { if (focused) setError(true); });
    return () => { focused = false; void deactivateKeepAwake(tag).catch(() => {}); };
  }, [enabled]));
  return error;
}
export function CookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), { doc, update, commit, startTimer, readable, saving, dirty, error, discoveryScope } = useFood();
  const { theme, textMultiplier, setNotice } = usePreferences(), t = useT("cook"), tc = useT("common");
  usePublishedRecipe(doc.recipes.drafts.some(d => d.id === id) ? null : id);
  const recipe = cookingRecipeById(id, doc.recipes), session = doc.cooking?.recipeId === id ? doc.cooking : null;
  const privateDraft = doc.recipes.drafts.find(d => d.id === id), detailPath = recipe?.private ? "/private-recipe/" + id : "/cook/recipe/" + id;
  const restricted = !!recipe && (!!recipe.withdrawal || (!!privateDraft && !!cookingIssue(privateDraft)) || (!!session && (session.recipeVersion ?? 1) !== recipe.revision));
  const awakeError = useCookingAwake(!!session && !restricted);
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [sheet, setSheet] = useState<"timer" | "ingredients" | null>(null), [offer, setOffer] = useState(false);
  const focused = useIsFocused(), navigated = useRef(false);
  const [completion, setCompletion] = useState<{ scope: string; recipeId: string; finishedAt: number; path: string } | null>(null);
  useEffect(() => {
    if (!completion || completion.scope !== discoveryScope || completion.recipeId !== id || !focused || saving || dirty || error || doc.cooking || navigated.current) return;
    if (!doc.recipes.cooked.some(entry => entry.recipeId === id && entry.finishedAt === completion.finishedAt)) return;
    navigated.current = true;
    setNotice({ text: t("cookingComplete") });
    router.dismissTo(completion.path as never);
  }, [completion, discoveryScope, id, focused, saving, dirty, error, doc.cooking, doc.recipes.cooked, setNotice, t]);
  if (!recipe || !session) return <Screen title={t("cookingTitle")} backTo="/cook"><EmptyState title={t("noCooking")} text="" action={t("viewRecipe")} onPress={() => router.dismissTo((id.startsWith("recipe-") ? "/private-recipe/" + id : detailPath) as never)} icon="restaurant-outline" /></Screen>;
  if (restricted) return <Screen title={t("recipeChanged")}><InfoBox title={recipe.withdrawal ? t("recipeWithdrawn") : t("newerVersion")} text={recipe.withdrawal ?? t("reviewBeforeRestart")} /><Button label={t("reviewRecipe")} onPress={() => router.dismissTo(detailPath as never)} /></Screen>;
  const gathering = !!session.gathering, total = recipe.steps.length, scale = session.servings / recipe.servings;
  const step = recipe.steps[session.step], last = session.step >= total - 1;
  // Steps already opened; sessions saved before `seen` existed count every step up to the current one.
  const seen = session.seen ?? (gathering ? [] : Array.from({ length: session.step + 1 }, (_, index) => index));
  const open = (index: number): Partial<CookingSession> => ({ gathering: false, step: index, seen: [...new Set([...seen, index])].sort((a, b) => a - b) });
  const patch = (changes: Partial<CookingSession>) => update(current => current.cooking?.recipeId === id ? { ...current, cooking: { ...current.cooking, ...changes } } : current);
  // One tick per ingredient wherever it is listed (gather list, step list, ingredients sheet). Sessions saved before this kept
  // per-step ticks in `used` ("step:id"); those still count, and unticking clears both.
  const usedId = (key: string) => key.slice(key.indexOf(":") + 1);
  const ticked = [...new Set([...(session.gathered ?? []), ...(session.used ?? []).map(usedId)])];
  const toggleIngredient = (ingredientId: string) => void update(current => {
    const active = current.cooking;
    if (active?.recipeId !== id) return current;
    const gathered = active.gathered ?? [], used = active.used ?? [];
    const on = gathered.includes(ingredientId) || used.some(key => usedId(key) === ingredientId);
    return { ...current, cooking: { ...active, gathered: on ? gathered.filter(value => value !== ingredientId) : [...gathered, ingredientId],
      used: on ? used.filter(key => usedId(key) !== ingredientId) : used } };
  });
  const finish = async () => {
    const entry = { recipeId: id, revision: recipe.revision, servings: session.servings, finishedAt: Date.now() };
    setCompletion({ scope: discoveryScope, recipeId: id, finishedAt: entry.finishedAt, path: detailPath });
    // The last step remains visible after failure. Banner Retry commits the same entry, then the effect returns to detail once.
    await commit(current => ({ ...current, cooking: null, recipes: { ...current.recipes, cooked: [entry, ...current.recipes.cooked].slice(0, cookedLimit) } }));
  };
  const move = async (direction: 1 | -1) => {
    if (lock.current || !readable) return;
    lock.current = true; setBusy(true);
    try {
      if (gathering) { if (direction === 1) await patch(open(0)); }
      else if (direction === -1 && session.step === 0) await patch({ gathering: true });
      else if (direction === 1 && last) await finish();
      else await patch(open(Math.max(0, session.step + direction)));
      setOffer(false);
    } finally { lock.current = false; setBusy(false); }
  };
  // A step tab jumps straight to that step (leaving the gather list); it never finishes the recipe.
  const jump = async (index: number) => {
    if (lock.current || !readable || (!gathering && index === session.step)) return;
    lock.current = true; setBusy(true);
    try { await patch(open(index)); setOffer(false); }
    finally { lock.current = false; setBusy(false); }
  };
  const servingsControl = <Servings value={session.servings} onChange={servings => void patch({ servings })} />;
  // Close, the recipe name, a new timer, the ingredients and the step tabs stay in view while the step scrolls (owner, 28 Oct 2026).
  const header = <View style={s.header}>
    <View style={[common.row, s.headRow]}>
      <IconButton label={tc("close")} icon="close" onPress={() => router.dismissTo("/cook")} />
      <T variant="subtitle" accessibilityRole="header" numberOfLines={1} style={common.flex}>{recipe.name}</T>
      <IconButton label={t("newTimer")} icon="timer-outline" onPress={() => setSheet("timer")} />
      <IconButton label={t("ingredients")} icon="list-outline" onPress={() => setSheet("ingredients")} />
    </View>
    <StepTabs titles={recipe.steps.map(item => item.title)} current={gathering ? null : session.step} seen={seen} disabled={busy || !readable} onSelect={index => void jump(index)} />
  </View>;
  // Running timers and the step buttons are pinned under the page, so moving on never needs a scroll.
  const bottomBar = <View style={[s.bottom, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
    <CookTimerBar />
    <View style={common.row}>
      {!gathering && <IconButton label={t("previous")} icon="chevron-back" disabled={busy || !readable} onPress={() => void move(-1)} />}
      <View style={common.flex}><Button label={gathering ? t("startCooking") : last ? t("finishCooking") : tc("next")} disabled={busy || !readable} loading={busy} onPress={() => void move(1)} /></View>
    </View>
  </View>;
  return <Screen back={false} hideTimers pinHeader header={header} bottomBar={bottomBar}>
    {/* Swiping moves between steps like Previous and Next, but never finishes the recipe: the last step needs the Finish button. */}
    <StepSwipe onNext={() => { if (!last || gathering) void move(1); }} onPrevious={() => { if (!gathering) void move(-1); }}>
    {gathering ? <><T variant="title">{t("gatherTitle")}</T>{servingsControl}
      <GatherList ingredients={recipe.ingredients} scale={scale} checked={ticked} disabled={!readable} onToggle={toggleIngredient} /></> : step && <>
      <T variant="title">{step.title}</T><T style={{ fontSize: 20 * textMultiplier, lineHeight: 29 * textMultiplier }}>{step.instruction}</T>
      {privateDraft?.steps[session.step]?.photo ? <Image source={{ uri: privateDraft.steps[session.step].photo }} contentFit="contain" style={{ width: "100%", height: 160 }} accessibilityLabel={t("stepPhoto", { n: session.step + 1 })} />
        : step.photo ? <StepPhoto path={step.photo} height={200} label={t("stepPhoto", { n: session.step + 1 })} /> : null}
      <StepChecklist ingredients={recipe.ingredients} ids={stepIngredientIds(recipe, session.step)} scale={scale} checked={ticked} disabled={!readable} onToggle={toggleIngredient} />
      {step.timer && <Button label={t("startTimerMinutes", { n: Math.round(step.timer.seconds / 60) })} icon="timer-outline" variant="secondary" disabled={!readable}
        onPress={() => void startTimer(id, step.timer!.label, step.timer!.seconds).then(okay => { if (okay) setOffer(true); })} />}
      {offer && <TimerAlertOffer />}
    </>}
    </StepSwipe>
    {awakeError && <T variant="small" muted>{t("awakeError")}</T>}
    <IngredientSheet visible={sheet === "ingredients"} onClose={() => setSheet(null)} ingredients={recipe.ingredients} scale={scale} servings={session.servings}
      onServings={servings => void patch({ servings })} ticked={ticked} onToggle={toggleIngredient} disabled={!readable} />
    <TimerSheet visible={sheet === "timer"} onClose={() => setSheet(null)} recipeId={id} defaultName={!gathering && step ? step.title : recipe.name} />
  </Screen>;
}
export function TimersScreen() {
  const { doc } = useFood(), t = useT("cook"), cooking = doc.cooking;
  return <Screen title={t("timersTitle")} hideTimers>
    {/* Mid-cook the way out of an empty Timers page is back to the recipe being cooked, not away to browse. */}
    {!doc.timers.length && <EmptyState title={t("noTimers")} text="" icon="timer-outline" action={cooking ? t("backToCooking") : t("browseRecipesLower")}
      onPress={() => router.dismissTo((cooking ? "/cooking/" + cooking.recipeId : "/cook") as never)} />}
    {doc.timers.map(timer => <TimerCard key={timer.id} timer={timer} />)}
    <TimerAlertControl />
  </Screen>;
}
const s = StyleSheet.create({
  header: { gap: 10, paddingBottom: 6 },
  headRow: { gap: 8 },
  bottom: { gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
