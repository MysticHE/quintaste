import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { Image } from "expo-image";
import { StepPhoto } from "../../components/recipes/StepPhoto";
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { CookingTools } from "../../components/recipes/CookingTools";
import { Button, T, common } from "../../components/ui";
import { Chip, Chips, EmptyState, InfoBox, Servings } from "../../components/food/Controls";
import { GatherList, StepChecklist, TimerAlertOffer } from "../../components/recipes/CookingParts";
import { cookedLimit } from "../../state/recipe-workspace";
import type { CookingSession } from "../../types/food";
import { TimerCard } from "../../components/food/Timers";
import { StepSwipe, StepTabs } from "../../components/recipes/StepTabs";
import { cookingRecipeById, cookingIssue } from "../../utils/private-recipes";
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
  const [panel, setPanel] = useState<"servings" | "ingredients" | null>(null), [offer, setOffer] = useState(false);
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
  const toggle = (list: "gathered" | "used", key: string) => void update(current => {
    const active = current.cooking;
    if (active?.recipeId !== id) return current;
    const values = active[list] ?? [];
    return { ...current, cooking: { ...active, [list]: values.includes(key) ? values.filter(value => value !== key) : [...values, key] } };
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
      setPanel(null); setOffer(false);
    } finally { lock.current = false; setBusy(false); }
  };
  // A step tab jumps straight to that step (leaving the gather list); it never finishes the recipe.
  const jump = async (index: number) => {
    if (lock.current || !readable || (!gathering && index === session.step)) return;
    lock.current = true; setBusy(true);
    try { await patch(open(index)); setPanel(null); setOffer(false); }
    finally { lock.current = false; setBusy(false); }
  };
  const servingsControl = <Servings value={session.servings} onChange={servings => void patch({ servings })} />;
  const gatherList = <GatherList ingredients={recipe.ingredients} scale={scale} checked={session.gathered ?? []} disabled={!readable} onToggle={key => toggle("gathered", key)} />;
  return <Screen back={false} hideTimers header={<View style={common.row}><T variant="subtitle" accessibilityRole="header" style={common.flex}>{recipe.name}</T>
    <Chip label={tc("close")} icon="close-outline" onPress={() => router.dismissTo("/cook")} /></View>}>
    <T variant="small" color={theme.accent}>{gathering ? t("beforeYouStart") : t("stepOfTotal", { n: Math.min(session.step + 1, total), total })} · {t("servingsCount", { n: session.servings })}</T>
    <View style={{ height: 4, backgroundColor: theme.muted, borderRadius: 2 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: gathering ? 0 : Math.min(session.step + 1, total) }}>
      <View style={{ height: 4, width: `${(gathering ? 0 : Math.min(session.step + 1, total)) / total * 100}%` as `${number}%`, borderRadius: 2, backgroundColor: theme.accent }} />
    </View>
    <StepTabs titles={recipe.steps.map(item => item.title)} current={gathering ? null : session.step} seen={seen} disabled={busy || !readable} onSelect={index => void jump(index)} />
    {/* Swiping moves between steps like Previous and Next, but never finishes the recipe: the last step needs the Finish button. */}
    <StepSwipe onNext={() => { if (!last || gathering) void move(1); }} onPrevious={() => { if (!gathering) void move(-1); }}>
    {gathering ? <><T variant="title">{t("gatherTitle")}</T>{servingsControl}{gatherList}</> : step && <>
      <T variant="title">{step.title}</T><T style={{ fontSize: 20 * textMultiplier, lineHeight: 29 * textMultiplier }}>{step.instruction}</T>
      {privateDraft?.steps[session.step]?.photo ? <Image source={{ uri: privateDraft.steps[session.step].photo }} contentFit="contain" style={{ width: "100%", height: 160 }} accessibilityLabel={t("stepPhoto", { n: session.step + 1 })} />
        : step.photo ? <StepPhoto path={step.photo} height={220} label={t("stepPhoto", { n: session.step + 1 })} /> : null}
      <StepChecklist ingredients={recipe.ingredients} ids={step.ingredientIds} step={session.step} scale={scale} used={session.used ?? []} disabled={!readable} onToggle={key => toggle("used", key)} />
      {step.timer && <Button label={t("startTimerMinutes", { n: Math.round(step.timer.seconds / 60) })} icon="timer-outline" variant="secondary" disabled={!readable}
        onPress={() => void startTimer(id, step.timer!.label, step.timer!.seconds).then(okay => { if (okay) setOffer(true); })} />}
      {offer && <TimerAlertOffer />}
      <Chips>
        <Chip label={t("servingsChip", { n: session.servings })} icon="people-outline" selected={panel === "servings"} onPress={() => setPanel(panel === "servings" ? null : "servings")} />
        <Chip label={t("allIngredients")} icon="list-outline" selected={panel === "ingredients"} onPress={() => setPanel(panel === "ingredients" ? null : "ingredients")} />
      </Chips>
      {panel === "servings" && servingsControl}
      {panel === "ingredients" && gatherList}
    </>}
    </StepSwipe>
    <View style={common.row}>{!gathering && <View style={common.flex}><Button label={t("previous")} variant="secondary" disabled={busy || !readable} onPress={() => void move(-1)} /></View>}
      <View style={common.flex}><Button label={gathering ? t("startCooking") : last ? t("finishCooking") : tc("next")} disabled={busy || !readable} loading={busy} onPress={() => void move(1)} /></View></View>
    {awakeError && <T variant="small" muted>{t("awakeError")}</T>}
    <CookingTools recipeId={id} />
  </Screen>;
}
export function TimersScreen() {
  const { doc } = useFood(), t = useT("cook");
  return <Screen title={t("timersTitle")} hideTimers>
    {!doc.timers.length && <EmptyState title={t("noTimers")} text="" icon="timer-outline" action={t("browseRecipesLower")} onPress={() => router.dismissTo("/cook")} />}
    {doc.timers.map(timer => <TimerCard key={timer.id} timer={timer} />)}
    <TimerAlertControl />
  </Screen>;
}

