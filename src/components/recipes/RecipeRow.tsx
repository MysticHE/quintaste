import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { fivePungentLabel } from "../../config/preferences";
import { photos } from "../../data/photos";
import { alliumFree, recipeFit } from "../../utils/recipe-dietary";
import { cookedStats } from "../../utils/recipe-browse";
import { recipeShareMessage } from "../../utils/recipe-share";
import { ReactionColumn } from "../ReactionBar";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { PhotoPostCard, PostChip, PostFact, PostFacts } from "../discovery/PhotoPostCard";

/**
 * A recipe as the same photo post as an Explore place: cooking time top-left, like / save / share down the right edge,
 * the name and facts on the photo. Diet and the five pungent stay on the card because they decide a meal here.
 */
export function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const { doc } = useFood(), { draft, theme } = usePreferences(), save = useRecipeSave(recipe.id);
  const cooked = cookedStats(doc.recipes.cooked, recipe.id).count;
  const fit = recipeFit(recipe, draft.diet, draft.excluded);
  const diet = [recipe.dietary.diet !== "Unknown" ? recipe.dietary.diet : "", alliumFree(recipe) ? fivePungentLabel : ""].filter(Boolean).join(" · ");
  const facts = [recipe.categories[0] ?? "", recipe.onePot ? "One pot" : "", recipe.member ? "By " + recipe.author : ""].filter(Boolean).join(" · ");
  return <PhotoPostCard testID="recipe-card" photo={{ path: recipe.image?.path, source: recipe.image?.path ? undefined : recipe.photo ? photos[recipe.photo] : undefined, fallback: recipe.categories[0] ?? "Recipe" }}
    title={recipe.name} label={[recipe.name, recipe.minutes + " min", facts, diet].filter(Boolean).join(". ")} hint="Opens the recipe" onPress={onPress}
    topLeft={<PostChip icon="time-outline" label={recipe.minutes + " min"} />}
    side={<ReactionColumn kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe)}
      save={save} />}>
    {!!facts && <PostFact icon="restaurant-outline">{facts}</PostFact>}
    <PostFacts>
      {!!diet && <PostFact icon="leaf-outline" shrink>{diet}</PostFact>}
      {fit.fit === "Conflicts" && <PostFact icon="alert-circle-outline" iconColor={theme.mediaRating} shrink>Contains {fit.conflicts.join(", ").toLowerCase()}</PostFact>}
      {cooked > 0 && <PostFact icon="checkmark-done-outline" shrink>Cooked {cooked}×</PostFact>}
    </PostFacts>
  </PhotoPostCard>;
}
