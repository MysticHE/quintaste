import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text } from './http';
import { search } from './content-members';

// The learned ingredient database (server/nutrition/schema.sql): names the AI matched to a USDA food or looked up on the
// web. Staff approve, correct the weights or figures, reject, or ask the AI again with a note. Every change reaches the
// recipes that use the name at the app's next hourly nutrition refresh.
const statuses = ['auto', 'approved', 'unknown', 'rejected', 'retry'] as const;
const NUTRIENTS = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'] as const;
const LIMITS: Record<string, number> = { kcal: 900, protein: 100, fat: 100, carbs: 100, fibre: 100, sugar: 100, sodium: 40000 };

export async function ingredientList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const filter = choice(status || 'auto', statuses, 'status'), term = search(q);
  return (await query(`SELECT i.name_key AS id, i.name, i.status, i.usda, i.usda_name, i.negligible, i.g_per_ml::float AS g_per_ml, i.units, i.confidence,
      i.reason, i.staff_note, i.updated_at, i.updated_at::text AS version, i.reviewed_at, f.id AS food_id, f.name AS food_name, f.per100, f.sources, f.note AS food_note,
      (SELECT count(*)::int FROM nutrition.recipe_ingredient ri WHERE ri.name_key = i.name_key) AS recipes
    FROM nutrition.ingredient i LEFT JOIN nutrition.food f ON f.id = i.food_id
    WHERE i.status = $1 AND ($2 = '' OR i.name ILIKE $2 OR i.name_key ILIKE $2 OR coalesce(i.usda_name, f.name, '') ILIKE $2)
    ORDER BY recipes DESC, i.updated_at DESC, i.name_key LIMIT ${pageSize} OFFSET $3`, [filter, term, skip])).rows;
}

const optionalNumber = (value: unknown, name: string, min: number, max: number) => {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'string' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) throw new HttpError(400, `Check ${name}.`);
  return Math.round(number * 1000) / 1000;
};
function unitWeights(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Check the unit weights.');
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 8) throw new HttpError(400, 'Use at most 8 unit weights.');
  return Object.fromEntries(entries.map(([unit, grams]) => {
    if (!/^[a-z]{1,20}$/.test(unit)) throw new HttpError(400, 'Check the unit names.');
    return [unit, optionalNumber(grams, 'grams for ' + unit, 0.05, 5000) ?? (() => { throw new HttpError(400, 'Check grams for ' + unit + '.'); })()];
  }));
}
function per100(value: unknown) {
  if (!value || typeof value !== 'object') throw new HttpError(400, 'Check the figures.');
  const input = value as Record<string, unknown>;
  const out = Object.fromEntries(NUTRIENTS.map(n => [n, optionalNumber(input[n], n, 0, LIMITS[n])]));
  if (out.kcal === null || out.protein === null || out.fat === null || out.carbs === null) throw new HttpError(400, 'Energy, protein, fat and carbohydrate are needed.');
  if (out.protein + out.fat + out.carbs > 105) throw new HttpError(400, 'Protein, fat and carbohydrate add up to more than 100 g.');
  return out;
}

/** approve, reject, retry (ask the AI again with a note) or edit (weights, figures of a food USDA lacks). */
export async function ingredientAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['approve', 'reject', 'retry', 'edit'] as const, 'action');
  const key = text(input.id, 'ingredient', 80), version = text(input.version, 'version', 40);
  authorize(member, 'content');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    const row = (await db.query<{ status: string; usda: string | null; food_id: string | null; negligible: boolean }>(
      'SELECT status, usda, food_id, negligible FROM nutrition.ingredient WHERE name_key=$1 AND updated_at::text=$2 FOR UPDATE', [key, version])).rows[0];
    if (!row) throw new HttpError(409, 'This changed since you opened it. Refresh the list.');
    const sourced = !!row.usda || !!row.food_id || row.negligible;
    let note: string | undefined;
    if (act === 'approve') {
      if (!sourced) throw new HttpError(409, 'There is no food to approve. Ask the AI again instead.');
      await db.query("UPDATE nutrition.ingredient SET status='approved', reviewed_by=$2, reviewed_at=now(), updated_at=now() WHERE name_key=$1", [key, member.id]);
    } else if (act === 'reject') {
      await db.query("UPDATE nutrition.ingredient SET status='rejected', reviewed_by=$2, reviewed_at=now(), updated_at=now() WHERE name_key=$1", [key, member.id]);
      note = 'Rejected. Recipes stop using it at the next hourly refresh.';
    } else if (act === 'retry') {
      const staffNote = text(input.note, 'what was wrong', 300, 5);
      await db.query("UPDATE nutrition.ingredient SET status='retry', staff_note=$2, reviewed_by=$3, reviewed_at=now(), updated_at=now() WHERE name_key=$1", [key, staffNote, member.id]);
      note = 'The AI will look again within an hour.';
    } else {
      if (!sourced) throw new HttpError(409, 'There is no food to correct. Ask the AI again instead.');
      const negligible = input.negligible === true, density = optionalNumber(input.gPerMl, 'grams per ml', 0.05, 3), weights = unitWeights(input.units ?? {});
      if (row.food_id && input.per100 !== undefined) {
        await db.query('UPDATE nutrition.food SET per100=$2, updated_at=now() WHERE id=$1', [row.food_id, JSON.stringify(per100(input.per100))]);
      }
      await db.query(`UPDATE nutrition.ingredient SET status='approved', negligible=$2, g_per_ml=$3, units=$4, reviewed_by=$5, reviewed_at=now(), updated_at=now()
        WHERE name_key=$1`, [key, negligible, density, JSON.stringify(weights), member.id]);
      note = 'Saved and approved. Recipes update at the next hourly refresh.';
    }
    await audit(db, member.id, 'content.ingredient.' + act, 'ingredient:' + key, reason, { note: input.note ?? null });
    return { saved: true, note };
  });
}
