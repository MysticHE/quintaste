import { pool } from '../config.mjs';
import { uuid } from '../community/http.mjs';

/** The row id of a recipe members can currently see, from its public id, or null. Used to file reports. */
export async function publishedRecipeId(value) {
  const id = typeof value === 'string' && value.startsWith('member-') ? value.slice(7) : '';
  if (!uuid(id)) return null;
  const found = await pool.query('SELECT 1 FROM recipes.recipe WHERE id=$1 AND live IS NOT NULL AND hidden_at IS NULL', [id]);
  return found.rowCount ? id : null;
}
