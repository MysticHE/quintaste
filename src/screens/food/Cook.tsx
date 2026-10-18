import { router } from "expo-router";
import { View } from "react-native";
import { CookLayout as Screen } from "../../components/recipes/CookLayout";
import { Button, Card, T, common } from "../../components/ui";
import { Chip, EmptyState, IconButton } from "../../components/food/Controls";
import { BrowseActions, BrowseHeader } from "../../components/BrowseControls";
import { RecipeRow } from "../../components/recipes/RecipeRow";
import { bundledRecipes } from "../../data/recipes";
import { cookingRecipeById } from "../../utils/private-recipes";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { activeFilterCount, browseRecipes } from "../../utils/recipe-browse";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { usePublishedRecipes } from "../../components/recipes/PublishedRecipes";
import { useMemberRecipes } from "../../hooks/useMemberRecipes";

export function CookScreen() {
  const { doc, isSaved, cookSearch: query, setCookSearch: setQuery, cookBrowse: browse, setCookBrowse } = useFood();
  const { draft } = usePreferences();
  const published = usePublishedRecipes(), members = useMemberRecipes();
  const hasMore = published.hasMore || members.hasMore, limited = published.limited || members.limited;
  const more = () => { if (published.hasMore) published.more(); if (members.hasMore) members.more(); };
  const visible = browseRecipes([...published.recipes, ...members.recipes, ...bundledRecipes()], browse, query, { diet: draft.diet, excluded: draft.excluded, isSaved: id => isSaved("recipe", id), cooked: doc.recipes.cooked });
  const resume = doc.cooking && cookingRecipeById(doc.cooking.recipeId, doc.recipes);
  const filters = activeFilterCount(browse) + Number(browse.category !== "All"), toGet = doc.recipes.shopping.filter(note => !note.checked).length;
  const narrowed = filters > 0 || browse.category !== "All";
  return <Screen back={false} header={<BrowseHeader query={query} onChange={setQuery} placeholder="Search recipes"
    action={<IconButton label={filters ? "Recipe filters, " + filters + " on" : "Recipe filters"} icon="options-outline" selected={filters > 0} badge={filters} onPress={() => router.push("/cook/filters")} />} />}>
    <BrowseActions>
      <Chip compact label="My recipes" icon="book-outline" onPress={() => router.push("/cook/my-recipes" as never)} />
      <Chip compact label={toGet ? "Shopping · " + toGet : "Shopping"} icon="basket-outline" onPress={() => router.push("/cook/shopping" as never)} />
    </BrowseActions>
    {resume && doc.cooking && doc.cooking.step < resume.steps.length && <Card style={common.row}>
      <View style={common.flex}>
        <T variant="subtitle">{resume.name}</T>
        <T variant="small" muted>{doc.cooking.gathering ? "Gathering ingredients" : "Step " + (doc.cooking.step + 1) + "/" + resume.steps.length} · {doc.cooking.servings} servings</T>
      </View>
      <IconButton label={"Resume cooking " + resume.name} icon="play-outline" selected onPress={() => router.push("/cooking/" + resume.id as never)} />
    </Card>}
    {!!visible.length && <View style={common.spread}>
      <T variant="small" muted accessibilityLiveRegion="polite">{visible.length} {visible.length === 1 ? "recipe" : "recipes"}{hasMore ? " shown" : ""}</T>
    </View>}
    {published.error && <><T variant="small" muted>{published.error}</T><Button label="Retry New Recipes" variant="link" onPress={published.refresh} /></>}
    {!visible.length && !published.loading && !members.loading && <EmptyState title="No Matching Recipes" text="Try another category, ingredient or filter." icon="restaurant-outline"
      action={narrowed || !!query ? "Show All Recipes" : undefined} onPress={() => { setQuery(""); void setCookBrowse({ ...defaultCookBrowse, sort: browse.sort }); }} />}
    {visible.map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onPress={() => router.push("/cook/recipe/" + recipe.id as never)} />)}
    {hasMore && !limited && <Button label="More Recipes" variant="secondary" disabled={published.loading || members.loading} onPress={more} />}
    {hasMore && limited && <T variant="small" muted>Narrow your search to see more recipes.</T>}
  </Screen>;
}
