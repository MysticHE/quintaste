import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit, type Actor } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, pageSize, text, uuid } from './http';
import { search } from './content-members';

// Member recipes are published or declined, hidden or restored, never rewritten: staff must not put words in a member's name.
type Version = { title: string; description: string; author: string; language: string; servings: number; minutes: number; diet: string; categories: string[];
  sponsorship: string; ingredients: { id: string; name: string; amount: number | null; unit: string; listingId?: string }[];
  steps: { title: string; instruction: string; minutes: number | null; ingredientIds: string[] }[]; revision: number };
const statuses = ['review', 'published', 'declined', 'hidden'] as const;
const where = { review: "r.pending_state='review'", published: 'r.live IS NOT NULL AND r.hidden_at IS NULL', declined: "r.pending_state='declined'", hidden: 'r.hidden_at IS NOT NULL' };

/** `origin` narrows to recipes members wrote ('member') or ones the AI recipe worker made from a request or video ('ai'). */
export async function memberRecipeList(member: Session, status: string, q: string, skip = 0, origin = '') {
  authorize(member, 'content');
  const filter = choice(status || 'review', statuses, 'status'), term = search(q), from = choice(origin || 'all', ['all', 'ai', 'member'] as const, 'origin');
  const shown = filter === 'review' || filter === 'declined' ? 'pending' : 'live';
  const rows = (await query<{ id: string; recipe: Version; version: string; photos: string[]; [key: string]: unknown }>(`SELECT r.id, r.${shown} AS recipe, '${shown}' AS version,
      r.pending_state, r.decision_note, r.live IS NOT NULL AS live, r.draft_key LIKE 'ai-%' AS ai, r.hidden_reason, r.submitted_at, r.published_at, coalesce(u.username, 'QuinTaste') AS username, coalesce(u.name, 'Wanted recipe from Cook searches') AS account_name,
      coalesce((SELECT json_agg(p.slot ORDER BY p.slot) FROM recipes.photo p WHERE p.recipe_id=r.id AND p.version='${shown}'), '[]') AS photos,
      (SELECT count(*)::int FROM ops.case_record c WHERE c.kind='report' AND c.status NOT IN ('resolved','dismissed') AND split_part(c.subject_id,'|',1)='recipe:member:'||r.id) AS reports
    FROM recipes.recipe r LEFT JOIN public."user" u ON u.id=r.author_id
    WHERE ${where[filter]} AND ($1='' OR r.${shown}->>'title' ILIKE $1 OR u.username ILIKE $1)
      AND ${from === 'all' ? 'true' : from === 'ai' ? "r.draft_key LIKE 'ai-%'" : "r.draft_key NOT LIKE 'ai-%'"}
    ORDER BY reports DESC, ${filter === 'review' ? 'r.submitted_at ASC' : 'r.updated_at DESC'}, r.id LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows;
  // Staff see which Market item each linked ingredient points to and whether buyers can see it.
  const ids = [...new Set(rows.flatMap(row => row.recipe.ingredients.map(i => i.listingId).filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))))];
  const items = ids.length ? (await query<{ id: string; name: string; status: string; price_cents: number }>('SELECT id, name, status, price_cents FROM market.listing WHERE id = ANY($1::uuid[])', [ids])).rows : [];
  const byId = new Map(items.map(item => [item.id, item]));
  return rows.map(row => ({ ...row, recipe: { ...row.recipe, ingredients: row.recipe.ingredients.map(i => ({ ...i, listing: i.listingId ? byId.get(i.listingId) ?? null : undefined })) } }));
}
export async function memberRecipePhoto(member: Session, id: string, version: string, slot: string) {
  authorize(member, 'content');
  if (!/^(cover|step-[0-9]{1,2})$/.test(slot)) throw new HttpError(400, 'Check photo.');
  return (await query<{ bytes: Buffer }>('SELECT bytes FROM recipes.photo WHERE recipe_id=$1 AND version=$2 AND slot=$3',
    [uuid(id, 'recipe'), choice(version, ['live', 'pending'] as const, 'version'), slot])).rows[0]?.bytes ?? null;
}
/** Publish or decline a submission, or hide or restore a published recipe. Publishing replaces the live version and its photos. */
export async function memberRecipeAction(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    return (await applyMemberRecipe(db, { id: member.id }, input, reason)).reply;
  });
}

/**
 * One recipe review decision by staff or a chef (docs/ADMIN_CHEFS_PLAN.md). A chef's publish is undone by hiding the recipe, and
 * a decline by sending it back to review while its author has not changed it.
 */
export async function applyMemberRecipe(db: PoolClient, actor: Actor, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['publish', 'decline', 'hide', 'restore'] as const, 'action'), id = uuid(input.id, 'recipe');
  let result, revision: number | null = null, update = false;
  if (act === 'publish' || act === 'decline') {
    revision = integer(input.revision, 'revision', 1, 10000);
    update = act === 'publish' && !!(await db.query('SELECT 1 FROM recipes.recipe WHERE id=$1 AND live IS NOT NULL', [id])).rowCount;
    result = act === 'publish'
      ? await db.query(`UPDATE recipes.recipe SET live=pending, live_revision=pending_revision, pending=NULL, pending_revision=NULL, pending_state=NULL,
          decision_note='', published_at=now(), updated_at=now() WHERE id=$1 AND pending_state='review' AND pending_revision=$2`, [id, revision])
      : await db.query(`UPDATE recipes.recipe SET pending_state='declined', decision_note=$3, updated_at=now() WHERE id=$1 AND pending_state='review' AND pending_revision=$2`,
        [id, revision, text(input.note, 'note shown to the author', 300, 5)]);
    if (result.rowCount && act === 'publish') {
      await db.query("DELETE FROM recipes.photo WHERE recipe_id=$1 AND version='live'", [id]);
      await db.query("UPDATE recipes.photo SET version='live' WHERE recipe_id=$1 AND version='pending'", [id]);
    }
  } else result = await db.query(`UPDATE recipes.recipe SET hidden_at=${act === 'hide' ? 'now()' : 'NULL'}, hidden_reason=$2, updated_at=now()
    WHERE id=$1 AND live IS NOT NULL AND (hidden_at IS NULL)=$3`, [id, act === 'hide' ? reason : null, act === 'hide']);
  if (!result.rowCount) throw new HttpError(409, 'This changed since you opened it. Refresh the list.');
  await audit(db, actor.id, 'content.member-recipe.' + act, 'member-recipe:' + id, reason, { note: input.note ?? null, revision: input.revision ?? null }, actor.bot);
  return { reply: { saved: true, note: act === 'publish' ? 'Published. Members see it in Cook within a minute.' : undefined },
    // Publishing an update replaces the live version, which cannot be brought back, so it has no undo.
    undo: (act === 'publish' && !update) || act === 'decline' ? { action: act, revision } : null };
}
/** Hides a chef-published recipe, or returns a declined one to review while its author has not sent a new version. */
export async function undoMemberRecipe(db: PoolClient, actor: Actor, id: string, undo: { action: string; revision: number }, reason: string) {
  const done = undo.action === 'publish'
    ? await db.query(`UPDATE recipes.recipe SET hidden_at=now(), hidden_reason=$3, updated_at=now() WHERE id=$1 AND live_revision=$2 AND hidden_at IS NULL`,
      [id, undo.revision, reason])
    : await db.query(`UPDATE recipes.recipe SET pending_state='review', decision_note='', updated_at=now()
      WHERE id=$1 AND pending_state='declined' AND pending_revision=$2`, [id, undo.revision]);
  if (!done.rowCount) throw new HttpError(409, 'This recipe changed since the chef decided. Nothing was undone.');
  await audit(db, actor.id, 'content.member-recipe.undo', 'member-recipe:' + id, reason, { undid: undo.action }, actor.bot);
}
