import { FeedHeader } from "../../components/feeds/FeedHeader";
import { EventsList } from "../../components/market/EventsList";
import { Browse, marketFilterCount } from "../market/Market";
import { useFeeds, defaultEventFilters, type FeedTab } from "../../state/Feeds";
import { router, useLocalSearchParams } from "expo-router";
import { useDeferredValue, useEffect, useState } from "react";
import { View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, Icon, T, common } from "../../components/ui";
import { Chip, EmptyState } from "../../components/food/Controls";
import { RecipeRow } from "../../components/recipes/RecipeRow";
import { ContinueCooking, useActiveCooking } from "../../components/recipes/ContinueCooking";
import { bundledRecipes } from "../../data/recipes";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { activeFilterCount, browseRecipes, matchesQuery } from "../../utils/recipe-browse";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { usePublishedRecipes } from "../../components/recipes/PublishedRecipes";
import { useMemberRecipes } from "../../hooks/useMemberRecipes";
import { MyRecipesContent } from "./MyRecipes";
import { SavedRecipes } from "./SavedRecipes";
import { useReactions } from "../../hooks/useReactions";
import { useDaypart } from "../../hooks/useDaypart";
import { useSearchLog } from "../../hooks/useRecipeSearch";
import { daypartName, daypartScore } from "../../utils/daypart";
import { useLanguage, useT } from "../../i18n";
import { ScreenList } from "../../components/ScreenList";
import { PostCardSkeleton, SkeletonList } from "../../components/Skeleton";

/** Feeds keeps existing cards and routes, with one top selection row. */
export function CookScreen() {
  const { tab: param, ingredient: wanted } = useLocalSearchParams<{ tab?: string; ingredient?: string }>();
  const tab: FeedTab = param === "events" || param === "market" ? param : "recipes";
  const ingredient = typeof wanted === "string" ? wanted.trim().slice(0, 40) : "";
  const feeds = useFeeds(), { cookSearch, cookBrowse } = useFood();
  const filtered = tab === "recipes" ? !!cookSearch || activeFilterCount(cookBrowse) > 0 || cookBrowse.category !== "All"
    : tab === "events" ? !!feeds.queries.events || JSON.stringify(feeds.events) !== JSON.stringify(defaultEventFilters())
    : !!feeds.queries.market || marketFilterCount(feeds.market) > 0;
  // The tab bar moves at once; the new list renders just after, so a tap never waits on a whole list being built.
  const shown = useDeferredValue(tab);
  // Old bookmarks keep their standalone collection; they no longer add tabs to Feeds.
  if (param === "mine" || param === "saved") return <LegacyCollection kind={param} />;
  // Recipes and Events run edge to edge like Explore (owner, 28 Oct 2026); the Market grid keeps the screen gutter.
  return <Screen back={false} list contentInset={shown === "market" ? undefined : 0} header={<FeedHeader tab={tab} filtered={filtered} onChange={next => router.setParams({ tab: next })} />}>
    {shown === "recipes" ? <Recipes ingredient={ingredient} /> : shown === "events" ? <EventsList query={feeds.queries.events} filters={feeds.events} />
      : <Browse query={feeds.queries.market} filters={feeds.market} setFilters={feeds.setMarket} clearQuery={() => feeds.setQueries(current => ({ ...current, market: "" }))} />}
  </Screen>;
}
function LegacyCollection({ kind }: { kind: "mine" | "saved" }) {
  const t = useT("cook");
  return <Screen title={t(kind === "mine" ? "tabMine" : "tabSaved")} backTo="/cook">
    {kind === "mine" ? <MyRecipesContent query="" /> : <SavedRecipes query="" />}
  </Screen>;
}
function Recipes({ ingredient }: { ingredient: string }) {
  const { doc, cookSearch: query, setCookSearch: setQuery, cookBrowse: browse, setCookBrowse } = useFood();
  const { draft } = usePreferences(), { now, at } = useDaypart(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const published = usePublishedRecipes(), members = useMemberRecipes();
  const hasMore = published.hasMore || members.hasMore, limited = published.limited || members.limited;
  const more = () => { if (published.hasMore) published.more(); if (members.hasMore) members.more(); };
  const all = [...published.recipes, ...members.recipes, ...bundledRecipes()];
  const visible = browseRecipes(all, browse, query, { diets: draft.diets, excluded: draft.excluded, cooked: doc.recipes.cooked, ingredient: ingredient || undefined, now, at });
  useReactions("recipe", visible.map(recipe => recipe.id));
  const loading = published.loading || members.loading;
  // Settled searches feed recent searches and the wanted-recipe list (docs/COOK_DISCOVERY_PLAN.md §1). The count ignores the
  // member's filters: a dish we have that a Vegan filter hides is not a missing recipe.
  useSearchLog(query, all.filter(recipe => matchesQuery(recipe, query)).length, !loading);
  const narrowed = activeFilterCount(browse) > 0 || browse.category !== "All", typed = query.trim();
  // The first card names the meal when it suits this time of day: "Dinner · 25 min".
  const first = visible[0], when = browse.sort === "Fit" && first && daypartScore(first, now) < 2 ? daypartName(now.part, language) : undefined;
  const showAll = () => { setQuery(""); if (ingredient) router.setParams({ ingredient: undefined }); void setCookBrowse({ ...defaultCookBrowse, sort: browse.sort }); };
  // The first visit waits briefly for the newest recipes, showing card shapes, so they do not reshuffle the list as they arrive.
  const firstLoad = (published.loading && published.data === undefined) || members.firstLoad, waiting = usePatience(firstLoad);
  // The header is passed only when it shows something, so an empty one adds no space above the first card.
  const cooking = !!useActiveCooking(), empty = !visible.length && !loading;
  return <ScreenList data={waiting ? [] : visible} keyExtractor={recipe => recipe.id} dimmed={!!published.stale} feedGap
    renderItem={({ item, index }) => <RecipeRow edgeToEdge recipe={item} when={index === 0 ? when : undefined} onPress={() => router.push("/cook/recipe/" + item.id as never)} />}
    header={cooking || !!ingredient || !!published.error || empty ? <>
      <ContinueCooking />
      {!!ingredient && <View style={common.row}><Chip compact selected label={t("withIngredient", { name: ingredient })} a11y={t("withIngredientHint", { name: ingredient })}
        trailing={<Icon name="close" size={16} />} onPress={() => router.setParams({ ingredient: undefined })} /></View>}
      {published.error && <><T variant="small" muted>{published.error}</T><Button label={t("retryNewRecipes")} variant="link" onPress={published.refresh} /></>}
      {empty && <EmptyState title={t("noMatchingRecipes")} text={typed.length >= 3 ? t("weCanWrite") : t("tryAnother")} icon="restaurant-outline"
        primary={typed.length >= 3 ? { label: t("getAiRecipe"), onPress: () => router.push({ pathname: "/cook/ai" as never, params: { dish: typed.slice(0, 300) } }) } : undefined}
        action={narrowed || !!query || !!ingredient ? t("showAllRecipes") : undefined} onPress={showAll} />}
    </> : undefined}
    headerBleed={waiting ? <SkeletonList label={tc("loadingLabel")} count={3} feedGap shape={() => <PostCardSkeleton edgeToEdge />} /> : undefined}
    footer={hasMore && !waiting ? limited ? <T variant="small" muted>{t("narrowSearch")}</T>
      : <Button label={t("moreRecipes")} variant="secondary" disabled={published.loading || members.loading} onPress={more} /> : null} />;
}
/**
 * True while `loading` holds, for at most 2.5 seconds: a slow connection then shows what is already here instead of waiting on.
 * Only the first visit of a session waits, since later visits read the recipes from memory; each new wait starts fresh.
 */
function usePatience(loading: boolean) {
  const [expired, setExpired] = useState(false);
  if (!loading && expired) setExpired(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setExpired(true), 2500);
    return () => clearTimeout(timer);
  }, [loading]);
  return loading && !expired;
}
