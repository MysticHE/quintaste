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
import { activeFilterCount, browseRecipes } from "../../utils/recipe-browse";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { usePublishedRecipes } from "../../components/recipes/PublishedRecipes";
import { useMemberRecipes } from "../../hooks/useMemberRecipes";
import { MyRecipesContent, useCreateRecipe } from "./MyRecipes";
import { ShoppingContent } from "./Shopping";
import { SavedRecipes } from "./SavedRecipes";
import { useReactions } from "../../hooks/useReactions";

type CookTab = "recipes" | "saved" | "mine" | "shopping";
const placeholders: Record<CookTab, string> = { recipes: "Search recipes", saved: "Search saved recipes", mine: "Search my recipes", shopping: "Search shopping list" };
/** Cook: browse recipes, saved recipes, the member's own recipes and the shopping list, as tabs under one search box. */
export function CookScreen() {
  const { tab: param, ingredient: wanted } = useLocalSearchParams<{ tab?: string; ingredient?: string }>(), tab: CookTab = param === "saved" || param === "mine" || param === "shopping" ? param : "recipes";
  // Recipes with this (the game's pantry book, GAME_PLAN §11): one ingredient narrows the recipe list until removed.
  const ingredient = typeof wanted === "string" ? wanted.trim().slice(0, 40) : "";
  const { doc, cookSearch, setCookSearch, cookBrowse: browse } = useFood();
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
  return <Screen back={false}
    header={<BrowseHeader query={query} onChange={setQuery} placeholder={placeholders[tab]}
      filter={tab === "recipes" ? { label: "Recipe filters", count: filters, onPress: () => router.push("/cook/filters") } : undefined} />}
    floatingAction={tab === "mine" && readable && doc.recipes.drafts.length ? <FloatingAddButton label="Create Recipe" onPress={() => void create()} />
      : tab === "recipes" ? <FloatingAddButton label="Get A Recipe With AI" onPress={() => router.push("/cook/ai" as never)} /> : undefined}>
    <IconTabs tabs={tabs} value={tab} label="Cook sections" onChange={next => router.setParams({ tab: next === "recipes" ? undefined : next })} />
    {tab === "recipes" ? <Recipes ingredient={ingredient} /> : tab === "saved" ? <SavedRecipes query={query} /> : tab === "mine" ? <MyRecipesContent query={query} /> : <ShoppingContent query={query} />}
  </Screen>;
}
function Recipes({ ingredient }: { ingredient: string }) {
  const { doc, cookSearch: query, setCookSearch: setQuery, cookBrowse: browse, setCookBrowse } = useFood();
  const { draft } = usePreferences();
  const published = usePublishedRecipes(), members = useMemberRecipes();
  const hasMore = published.hasMore || members.hasMore, limited = published.limited || members.limited;
  const more = () => { if (published.hasMore) published.more(); if (members.hasMore) members.more(); };
  const visible = browseRecipes([...published.recipes, ...members.recipes, ...bundledRecipes()], browse, query, { diets: draft.diets, excluded: draft.excluded, cooked: doc.recipes.cooked, ingredient: ingredient || undefined });
  useReactions("recipe", visible.map(recipe => recipe.id));
  const narrowed = activeFilterCount(browse) > 0 || browse.category !== "All";
  return <>
    <ContinueCooking />
    {!!ingredient && <View style={common.row}><Chip compact selected label={"With " + ingredient} a11y={"With " + ingredient + ". Remove this filter"}
      trailing={<Icon name="close" size={16} />} onPress={() => router.setParams({ ingredient: undefined })} /></View>}
    {!!visible.length && <View style={common.spread}>
      <T variant="small" muted accessibilityLiveRegion="polite">{visible.length} {visible.length === 1 ? "recipe" : "recipes"}{hasMore ? " shown" : ""}</T>
    </View>}
    {published.error && <><T variant="small" muted>{published.error}</T><Button label="Retry New Recipes" variant="link" onPress={published.refresh} /></>}
    {!visible.length && !published.loading && !members.loading && <EmptyState title="No Matching Recipes" text="Try another category, ingredient or filter." icon="restaurant-outline"
      action={narrowed || !!query || !!ingredient ? "Show All Recipes" : undefined} onPress={() => { setQuery(""); if (ingredient) router.setParams({ ingredient: undefined }); void setCookBrowse({ ...defaultCookBrowse, sort: browse.sort }); }} />}
    {visible.map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onPress={() => router.push("/cook/recipe/" + recipe.id as never)} />)}
    {hasMore && !limited && <Button label="More Recipes" variant="secondary" disabled={published.loading || members.loading} onPress={more} />}
    {hasMore && limited && <T variant="small" muted>Narrow your search to see more recipes.</T>}
  </>;
}
