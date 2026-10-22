import { notBlocked, notRestricted } from '../community/router.mjs';

/**
 * A level from a member's recipe is shown only while that recipe is live and shown, its author is not restricted, and neither side
 * has blocked the other (blocking is mutual, RECIPE_LEVELS_PLAN §10). `level` is the recipe_level alias; `viewer` the viewer's id param.
 */
export const authorVisible = (level, viewer) => `(${level}.recipe_id NOT LIKE 'member-%' OR EXISTS (SELECT 1 FROM recipes.recipe mr_ WHERE 'member-' || mr_.id::text = ${level}.recipe_id
  AND mr_.live IS NOT NULL AND mr_.hidden_at IS NULL AND ${notRestricted('mr_.author_id')} AND ${notBlocked('mr_.author_id', viewer)}))`;
