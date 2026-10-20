import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { photos } from "../../data/photos";
import { recipeBadges } from "../../utils/nutrition";
import { recipeFit } from "../../utils/recipe-dietary";
import { recipeShareMessage } from "../../utils/recipe-share";
import { ReactionColumn, cookedBy } from "../ReactionBar";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { useReaction } from "../../hooks/useReactions";
import { PhotoPostCard, PostChip, PostFact, PostFacts } from "../discovery/PhotoPostCard";

/**
 * A recipe as the same photo post as an Explore place: cooking time top-left, like / save / share down the right edge,
 * the name and facts on the photo. The diet labels (Vegan, Vegetarian, Plant-Based) stay on the card because they decide a meal here.
 */
/** `when` names the meal on the first card when it suits the time of day ("Dinner · 25 min"). */
export function RecipeRow({ recipe, onPress, when }: { recipe: Recipe; onPress: () => void; when?: string }) {
  const { draft, theme } = usePreferences(), save = useRecipeSave(recipe.id), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  const fit = recipeFit(recipe, draft.diets, draft.excluded), diet = fit.labels.join(" · ");
  const facts = [recipe.categories[0] ?? "", recipe.onePot ? "One pot" : "", recipe.member ? "By " + recipe.author : ""].filter(Boolean).join(" · ");
  // At most two HPB badges (first two in claim order); recipes without figures show no nutrition line.
  const badges = recipeBadges(recipe).slice(0, 2).join(" · ");
  return <PhotoPostCard testID="recipe-card" photo={{ path: recipe.image?.path, source: recipe.image?.path ? undefined : recipe.photo ? photos[recipe.photo] : undefined, fallback: recipe.categories[0] ?? "Recipe" }}
    title={recipe.name} label={[recipe.name, recipe.minutes + " min", facts, diet, badges].filter(Boolean).join(". ")} hint="Opens the recipe" onPress={onPress}
    topLeft={<PostChip icon="time-outline" label={(when ? when + " · " : "") + recipe.minutes + " min"} />}
    side={<ReactionColumn kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe)}
      save={save} />}>
    {!!facts && <PostFact icon="restaurant-outline">{facts}</PostFact>}
    <PostFacts>
      {!!diet && <PostFact icon="leaf-outline" shrink>{diet}</PostFact>}
      {fit.fit === "Conflicts" && <PostFact icon="alert-circle-outline" iconColor={theme.mediaRating} shrink>Contains {fit.conflicts.join(", ").toLowerCase()}</PostFact>}
      {cooks > 0 && <PostFact icon="flame-outline" shrink>{cookedBy(cooks)}</PostFact>}
    </PostFacts>
    {!!badges && <PostFact icon="nutrition-outline">{badges}</PostFact>}
  </PhotoPostCard>;
}
