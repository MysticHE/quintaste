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
import { daypartName, daypartScore } from "../../utils/daypart";
import type { RecipeCategory } from "../../types/food";
import { useLanguage, useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";

type CookTab = "recipes" | "saved" | "mine" | "shopping";
const placeholders: Record<CookTab, CookKey> = { recipes: "searchRecipes", saved: "searchSaved", mine: "searchMine", shopping: "searchShopping" };
/** Cook: browse recipes, saved recipes, the member's own recipes and the shopping list, as tabs under one search box. */
export function CookScreen() {
  const { tab: param, ingredient: wanted } = useLocalSearchParams<{ tab?: string; ingredient?: string }>(), tab: CookTab = param === "saved" || param === "mine" || param === "shopping" ? param : "recipes";
  // Recipes with this (the game's pantry book, GAME_PLAN §11): one ingredient narrows the recipe list until removed.
  const ingredient = typeof wanted === "string" ? wanted.trim().slice(0, 40) : "";
  const { doc, cookSearch, setCookSearch, cookBrowse: browse, setCookBrowse } = useFood();
  const [local, setLocal] = useState({ saved: "", mine: "", shopping: "" }), { create, readable } = useCreateRecipe(), t = useT("cook");
  const query = tab === "recipes" ? cookSearch : local[tab];
  const setQuery = (value: string) => tab === "recipes" ? setCookSearch(value) : setLocal(current => ({ ...current, [tab]: value }));
  const filters = activeFilterCount(browse) + Number(browse.category !== "All"), toGet = doc.recipes.shopping.filter(note => !note.checked).length;
  const tabs: IconTab<CookTab>[] = [
    { id: "recipes", label: t("tabRecipes"), icon: "grid-outline", activeIcon: "grid" },
    { id: "saved", label: t("tabSaved"), icon: "bookmark-outline", activeIcon: "bookmark" },
    { id: "mine", label: t("tabMine"), icon: "book-outline", activeIcon: "book" },
    { id: "shopping", label: t("tabShopping"), icon: "cart-outline", activeIcon: "cart", badge: toGet },
  ];
  const filter = tab === "recipes" ? { label: t("recipeFilters"), count: filters, onPress: () => router.push("/cook/filters") } : undefined;
  // Recipes get suggestions from the recipes we have; the other tabs search what is already on screen.
  const box = useRecipeSearchBox({ query: cookSearch, onChange: setCookSearch, placeholder: t(placeholders.recipes), filter,
    onRecipe: id => router.push(("/cook/recipe/" + id) as never),
    onCategory: category => void setCookBrowse({ ...browse, category: category as RecipeCategory }),
    onAi: dish => router.push({ pathname: "/cook/ai" as never, params: { dish } }) });
  return <Screen back={false}
    header={<BrowseHeader query={query} onChange={setQuery} placeholder={t(placeholders[tab])} filter={filter}
      field={tab === "recipes" ? box.field : undefined} below={tab === "recipes" ? box.below : undefined} />}
    floatingAction={tab === "mine" && readable && doc.recipes.drafts.length ? <FloatingAddButton label={t("createRecipe")} onPress={() => void create()} />
      : tab === "recipes" ? <FloatingAddButton label={t("getAiRecipe")} onPress={() => router.push("/cook/ai" as never)} /> : undefined}>
    <IconTabs tabs={tabs} value={tab} label={t("cookSections")} onChange={next => router.setParams({ tab: next === "recipes" ? undefined : next })} />
    {tab === "recipes" ? <Recipes ingredient={ingredient} remember={box.remember} /> : tab === "saved" ? <SavedRecipes query={query} /> : tab === "mine" ? <MyRecipesContent query={query} /> : <ShoppingContent query={query} />}
  </Screen>;
}
function Recipes({ ingredient, remember }: { ingredient: string; remember: (term: string) => void }) {
  const { doc, cookSearch: query, setCookSearch: setQuery, cookBrowse: browse, setCookBrowse } = useFood();
  const { draft } = usePreferences(), { now, at } = useDaypart(), t = useT("cook"), language = useLanguage();
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
  const first = visible[0], when = browse.sort === "Fit" && first && daypartScore(first, now) < 2 ? daypartName(now.part, language) : undefined;
  const showAll = () => { setQuery(""); if (ingredient) router.setParams({ ingredient: undefined }); void setCookBrowse({ ...defaultCookBrowse, sort: browse.sort }); };
  return <>
    <ContinueCooking />
    {!!ingredient && <View style={common.row}><Chip compact selected label={t("withIngredient", { name: ingredient })} a11y={t("withIngredientHint", { name: ingredient })}
      trailing={<Icon name="close" size={16} />} onPress={() => router.setParams({ ingredient: undefined })} /></View>}
    {!!visible.length && <View style={common.spread}>
      <T variant="small" muted accessibilityLiveRegion="polite">{t(hasMore ? "recipeCountShown" : "recipeCount", { n: visible.length })}</T>
    </View>}
    {published.error && <><T variant="small" muted>{published.error}</T><Button label={t("retryNewRecipes")} variant="link" onPress={published.refresh} /></>}
    {!visible.length && !loading && <EmptyState title={t("noMatchingRecipes")} text={typed.length >= 3 ? t("weCanWrite") : t("tryAnother")} icon="restaurant-outline"
      primary={typed.length >= 3 ? { label: t("getAiRecipe"), onPress: () => router.push({ pathname: "/cook/ai" as never, params: { dish: typed.slice(0, 300) } }) } : undefined}
      action={narrowed || !!query || !!ingredient ? t("showAllRecipes") : undefined} onPress={showAll} />}
    {visible.map((recipe, index) => <RecipeRow key={recipe.id} recipe={recipe} when={index === 0 ? when : undefined} onPress={() => router.push("/cook/recipe/" + recipe.id as never)} />)}
    {hasMore && !limited && <Button label={t("moreRecipes")} variant="secondary" disabled={published.loading || members.loading} onPress={more} />}
    {hasMore && limited && <T variant="small" muted>{t("narrowSearch")}</T>}
  </>;
}
