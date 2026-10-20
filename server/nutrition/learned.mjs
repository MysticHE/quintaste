import { pool } from '../config.mjs';
import { words } from './reference.mjs';

/**
 * The learned ingredient database (server/nutrition/schema.sql): names the reviewed table does not know, matched once
 * by the AI and stored, plus which recipes use which names so corrections reach every recipe.
 */

/** The stored key for an ingredient name: lower-case words without preparation words ("Finely chopped Shallots" -> "shallot"). */
export function nameKey(name) {
  const key = words(name).join(' ').slice(0, 80).trim();
  return /^[a-z0-9][a-z0-9 ]{0,79}$/.test(key) ? key : null;
}

/** Stored rows for these keys, each with its own food's per-100 g figures when it is not a USDA food. */
export async function learnedRows(keys, db = pool) {
  const list = [...new Set(keys.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = (await db.query(`SELECT i.name_key, i.name, i.status, i.usda, i.food_id, i.negligible, i.g_per_ml::float AS g_per_ml, i.units,
      i.staff_note, i.updated_at, f.per100, f.name AS food_name
    FROM nutrition.ingredient i LEFT JOIN nutrition.food f ON f.id = i.food_id WHERE i.name_key = ANY($1::text[])`, [list])).rows;
  return new Map(rows.map(row => [row.name_key, row]));
}

/**
 * Stores one answer. A new name, or one waiting to be asked again (retry, or unknown for 30 days), takes the whole
 * answer. A name already in use only gains unit weights it lacked (its food stays; staff decisions are never overwritten).
 * Rejected names are left alone. Returns whether anything changed.
 */
export async function saveLearned(row) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(`SELECT status, (status='unknown' AND updated_at < now() - interval '30 days') AS due
      FROM nutrition.ingredient WHERE name_key=$1 FOR UPDATE`, [row.key])).rows[0];
    let changed = false;
    if (current && (current.status === 'auto' || current.status === 'approved')) {
      // Only weights it lacks are added; an approved row that gains one goes back to To check, so staff see the new weight.
      changed = (await client.query(`UPDATE nutrition.ingredient SET units = $2::jsonb || units, g_per_ml = coalesce(g_per_ml, $3), updated_at = now(),
          status = 'auto', reason = CASE WHEN status = 'approved' THEN left('AI added a weight after approval: ' || $4, 500) ELSE reason END
        WHERE name_key=$1 AND (EXISTS (SELECT 1 FROM jsonb_object_keys($2::jsonb) AS added(unit) WHERE NOT (nutrition.ingredient.units ? added.unit))
          OR (g_per_ml IS NULL AND $3::numeric IS NOT NULL))`,
        [row.key, row.units ?? {}, row.gPerMl ?? null, String(row.reason ?? '')])).rowCount > 0;
    } else if (!current || current.status === 'retry' || current.due) {
      const foodId = row.food ? (await client.query('INSERT INTO nutrition.food (name, per100, sources, note) VALUES ($1, $2, $3, $4) RETURNING id',
        [row.food.name, row.food.per100, JSON.stringify(row.food.sources), row.food.note ?? ''])).rows[0].id : null;
      await client.query(`INSERT INTO nutrition.ingredient (name_key, name, status, usda, usda_name, food_id, negligible, g_per_ml, units, confidence, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (name_key) DO UPDATE SET name=EXCLUDED.name, status=EXCLUDED.status, usda=EXCLUDED.usda, usda_name=EXCLUDED.usda_name,
          food_id=EXCLUDED.food_id, negligible=EXCLUDED.negligible, g_per_ml=EXCLUDED.g_per_ml, units=EXCLUDED.units, confidence=EXCLUDED.confidence,
          reason=EXCLUDED.reason, updated_at=now()`,
        [row.key, row.name, row.status, row.usda ?? null, row.usdaName ?? null, foodId, !!row.negligible, row.gPerMl ?? null, row.units ?? {},
          row.confidence ?? null, String(row.reason ?? '').slice(0, 500)]);
      changed = true;
    }
    await client.query('COMMIT');
    return changed;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
/** Records which names a live recipe revision uses, replacing the previous list; `complete` is false while names still wait for the AI. */
export async function linkRecipe(db, recipeId, revision, keys, complete = true) {
  await db.query('DELETE FROM nutrition.recipe_ingredient WHERE recipe_id=$1', [recipeId]);
  const list = [...new Set(keys.filter(Boolean))];
  if (list.length) await db.query('INSERT INTO nutrition.recipe_ingredient (recipe_id, name_key) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING', [recipeId, list]);
  await db.query(`INSERT INTO nutrition.recipe_check (recipe_id, revision, complete, checked_at) VALUES ($1, $2, $3, now())
    ON CONFLICT (recipe_id) DO UPDATE SET revision=EXCLUDED.revision, complete=EXCLUDED.complete, checked_at=now()`, [recipeId, revision, complete]);
}
