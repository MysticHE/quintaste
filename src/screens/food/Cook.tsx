import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, Icon, T, common } from "../../components/ui";
import { Chip, EmptyState } from "../../components/food/Controls";
import { BrowseHeader, IconTabs, type IconTab } from "../../components/BrowseControls";
import { FloatingAddButton } from "../../components/FloatingAddButton";
import { RecipeRow } from "../../components/recipes/RecipeRow";
import { ContinueCooking } from "../../components/recipes/ContinueCooking";
import { bundledRecipes } from "../../data/recipes";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { activeFilterCount, browseRecipes, matchesQuery } from "../../utils/recipe-browse";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { usePublishedRecipes } from "../../components/recipes/PublishedRecipes";
import { useMemberRecipes } from "../../hooks/useMemberRecipes";
import { MyRecipesContent, useCreateRecipe } from "./MyRecipes";
import { ShoppingContent } from "./Shopping";
import { SavedRecipes } from "./SavedRecipes";
import { useReactions } from "../../hooks/useReactions";
import { useDaypart } from "../../hooks/useDaypart";
import { useSearchLog } from "../../hooks/useRecipeSearch";
import { useRecipeSearchBox } from "../../components/recipes/RecipeSearchBox";
import { daypartLabel, daypartScore } from "../../utils/daypart";
import type { RecipeCategory } from "../../types/food";

type CookTab = "recipes" | "saved" | "mine" | "shopping";
const placeholders: Record<CookTab, string> = { recipes: "Search recipes", saved: "Search saved recipes", mine: "Search my recipes", shopping: "Search shopping list" };
/** Cook: browse recipes, saved recipes, the member's own recipes and the shopping list, as tabs under one search box. */
export function CookScreen() {
  const { tab: param, ingredient: wanted } = useLocalSearchParams<{ tab?: string; ingredient?: string }>(), tab: CookTab = param === "saved" || param === "mine" || param === "shopping" ? param : "recipes";
  // Recipes with this (the game's pantry book, GAME_PLAN §11): one ingredient narrows the recipe list until removed.
  const ingredient = typeof wanted === "string" ? wanted.trim().slice(0, 40) : "";
  const { doc, cookSearch, setCookSearch, cookBrowse: browse, setCookBrowse } = useFood();
  const [local, setLocal] = useState({ saved: "", mine: "", shopping: "" }), { create, readable } = useCreateRecipe();
  const query = tab === "recipes" ? cookSearch : local[tab];
  const setQuery = (value: string) => tab === "recipes" ? setCookSearch(value) : setLocal(current => ({ ...current, [tab]: value }));
  const filters = activeFilterCount(browse) + Number(browse.category !== "All"), toGet = doc.recipes.shopping.filter(note => !note.checked).length;
  const tabs: IconTab<CookTab>[] = [
    { id: "recipes", label: "Recipes", icon: "grid-outline", activeIcon: "grid" },
    { id: "saved", label: "Saved recipes", icon: "bookmark-outline", activeIcon: "bookmark" },
    { id: "mine", label: "My recipes", icon: "book-outline", activeIcon: "book" },
    { id: "shopping", label: "Shopping list", icon: "cart-outline", activeIcon: "cart", badge: toGet },
  ];
  const filter = tab === "recipes" ? { label: "Recipe filters", count: filters, onPress: () => router.push("/cook/filters") } : undefined;
  // Recipes get suggestions from the recipes we have; the other tabs search what is already on screen.
  const box = useRecipeSearchBox({ query: cookSearch, onChange: setCookSearch, placeholder: placeholders.recipes, filter,
    onRecipe: id => router.push(("/cook/recipe/" + id) as never),
    onCategory: category => void setCookBrowse({ ...browse, category: category as RecipeCategory }),
    onAi: dish => router.push({ pathname: "/cook/ai" as never, params: { dish } }) });
  return <Screen back={false}
    header={<BrowseHeader query={query} onChange={setQuery} placeholder={placeholders[tab]} filter={filter}
      field={tab === "recipes" ? box.field : undefined} below={tab === "recipes" ? box.below : undefined} />}
    floatingAction={tab === "mine" && readable && doc.recipes.drafts.length ? <FloatingAddButton label="Create Recipe" onPress={() => void create()} />
      : tab === "recipes" ? <FloatingAddButton label="Get An AI Recipe" onPress={() => router.push("/cook/ai" as never)} /> : undefined}>
    <IconTabs tabs={tabs} value={tab} label="Cook sections" onChange={next => router.setParams({ tab: next === "recipes" ? undefined : next })} />
    {tab === "recipes" ? <Recipes ingredient={ingredient} remember={box.remember} /> : tab === "saved" ? <SavedRecipes query={query} /> : tab === "mine" ? <MyRecipesContent query={query} /> : <ShoppingContent query={query} />}
  </Screen>;
}
function Recipes({ ingredient, remember }: { ingredient: string; remember: (term: string) => void }) {
  const { doc, cookSearch: query, setCookSearch: setQuery, cookBrowse: browse, setCookBrowse } = useFood();
  const { draft } = usePreferences(), { now, at } = useDaypart();
  const published = usePublishedRecipes(), members = useMemberRecipes();
  const hasMore = published.hasMore || members.hasMore, limited = published.limited || members.limited;
  const more = () => { if (published.hasMore) published.more(); if (members.hasMore) members.more(); };
  const all = [...published.recipes, ...members.recipes, ...bundledRecipes()];
  const visible = browseRecipes(all, browse, query, { diets: draft.diets, excluded: draft.excluded, cooked: doc.recipes.cooked, ingredient: ingredient || undefined, now, at });
  useReactions("recipe", visible.map(recipe => recipe.id));
  const loading = published.loading || members.loading;
  // Settled searches feed recent searches and the wanted-recipe list (docs/COOK_DISCOVERY_PLAN.md §1). The count ignores the
  // member's filters: a dish we have that a Vegan filter hides is not a missing recipe.
  useSearchLog(query, all.filter(recipe => matchesQuery(recipe, query)).length, !loading, remember);
  const narrowed = activeFilterCount(browse) > 0 || browse.category !== "All", typed = query.trim();
  // The first card names the meal when it suits this time of day: "Dinner · 25 min".
  const first = visible[0], when = browse.sort === "Fit" && first && daypartScore(first, now) < 2 ? daypartLabel[now.part] : undefined;
  const showAll = () => { setQuery(""); if (ingredient) router.setParams({ ingredient: undefined }); void setCookBrowse({ ...defaultCookBrowse, sort: browse.sort }); };
  return <>
    <ContinueCooking />
    {!!ingredient && <View style={common.row}><Chip compact selected label={"With " + ingredient} a11y={"With " + ingredient + ". Remove this filter"}
      trailing={<Icon name="close" size={16} />} onPress={() => router.setParams({ ingredient: undefined })} /></View>}
    {!!visible.length && <View style={common.spread}>
      <T variant="small" muted accessibilityLiveRegion="polite">{visible.length} {visible.length === 1 ? "recipe" : "recipes"}{hasMore ? " shown" : ""}</T>
    </View>}
    {published.error && <><T variant="small" muted>{published.error}</T><Button label="Retry New Recipes" variant="link" onPress={published.refresh} /></>}
    {!visible.length && !loading && <EmptyState title="No Matching Recipes" text={typed.length >= 3 ? "We can write this one for you." : "Try another category, ingredient or filter."} icon="restaurant-outline"
      primary={typed.length >= 3 ? { label: "Get An AI Recipe", onPress: () => router.push({ pathname: "/cook/ai" as never, params: { dish: typed.slice(0, 300) } }) } : undefined}
      action={narrowed || !!query || !!ingredient ? "Show All Recipes" : undefined} onPress={showAll} />}
    {visible.map((recipe, index) => <RecipeRow key={recipe.id} recipe={recipe} when={index === 0 ? when : undefined} onPress={() => router.push("/cook/recipe/" + recipe.id as never)} />)}
    {hasMore && !limited && <Button label="More Recipes" variant="secondary" disabled={published.loading || members.loading} onPress={more} />}
    {hasMore && limited && <T variant="small" muted>Narrow your search to see more recipes.</T>}
  </>;
}
