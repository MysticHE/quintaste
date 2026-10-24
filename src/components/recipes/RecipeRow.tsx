import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { photos } from "../../data/photos";
import { badgeName, recipeBadges } from "../../utils/nutrition";
import { exclusionList, recipeFit } from "../../utils/recipe-dietary";
import { recipeShareMessage } from "../../utils/recipe-share";
import { categoryName } from "../../utils/recipe-browse";
import { ReactionColumn, cookedBy } from "../ReactionBar";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { useReaction } from "../../hooks/useReactions";
import { PhotoPostCard, PostChip, PostFact, PostFacts } from "../discovery/PhotoPostCard";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { useLanguage, useT } from "../../i18n";

/**
 * A recipe as the same photo post as an Explore place: cooking time top-left, like / save / share down the right edge,
 * the name and facts on the photo. The diet labels (Vegan, Vegetarian, Plant-Based) stay on the card because they decide a meal here.
 */
/** `when` names the meal on the first card when it suits the time of day ("Dinner · 25 min"). */
export function RecipeRow({ recipe, onPress, when }: { recipe: Recipe; onPress: () => void; when?: string }) {
  const { draft, theme } = usePreferences(), save = useRecipeSave(recipe.id), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  const dietText = useDietText(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const fit = recipeFit(recipe, draft.diets, draft.excluded), diet = fit.labels.map(dietText.line).join(t("sentenceJoin"));
  const category = recipe.categories[0] ? categoryName(recipe.categories[0], language) : "", minutes = tc("minutes", { n: recipe.minutes });
  const facts = [category, recipe.onePot ? t("onePot") : "", recipe.member ? t("byAuthor", { author: recipe.author }) : ""].filter(Boolean).join(" · ");
  // At most two HPB badges (first two in claim order); recipes without figures show no nutrition line.
  const badges = recipeBadges(recipe).slice(0, 2).map(badge => badgeName(badge, language)).join(" · ");
  return <PhotoPostCard testID="recipe-card" photo={{ path: recipe.image?.path, source: recipe.image?.path ? undefined : recipe.photo ? photos[recipe.photo] : undefined, fallback: category || t("recipeFallback") }}
    title={recipe.name} label={[recipe.name, minutes, facts, diet, badges].filter(Boolean).join(t("sentenceJoin"))} hint={t("opensRecipe")} onPress={onPress}
    topLeft={<PostChip icon="time-outline" label={(when ? when + " · " : "") + minutes} />}
    side={<ReactionColumn kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe, language)}
      save={save} />}>
    {!!facts && <PostFact icon="restaurant-outline">{facts}</PostFact>}
    {fit.labels.map(label => <PostFact key={label} leading={<DietIcon diet={label} size={14} color={theme.mediaForeground} />}>{dietText.line(label)}</PostFact>)}
    <PostFacts>
      {fit.fit === "Conflicts" && <PostFact icon="alert-circle-outline" iconColor={theme.mediaRating} shrink>{t("cardContains", { list: exclusionList(fit.conflicts, language) })}</PostFact>}
      {cooks > 0 && <PostFact icon="flame-outline" shrink>{cookedBy(cooks, language)}</PostFact>}
    </PostFacts>
    {!!badges && <PostFact icon="nutrition-outline">{badges}</PostFact>}
  </PhotoPostCard>;
}
