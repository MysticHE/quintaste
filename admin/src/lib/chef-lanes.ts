import 'server-only';
import type { PoolClient } from 'pg';
import type { Actor } from './audit';
import type { Capability } from './permissions';
import { query } from './db';
import { applyIngredient, undoIngredient } from './content-ingredients';
import { applyCreatorState, undoCreatorState, type CreatorState } from './creators';
import { applyGameLevel, undoGameLevel } from './game-content';
import { applyMemberRecipe, undoMemberRecipe } from './content-member-recipes';
import { applyDemand, undoDemand } from './recipe-demand';
import { applyMemberPost } from './content-members';
import { applyPlaceReport, fileRecallCase, undoPlaceReport, undoRecallCase } from './cases';
import { HttpError } from './http';

/**
 * The admin lanes chefs (QT bots) work in (docs/ADMIN_CHEFS_PLAN.md §1). Each lane belongs to one chef and lists the actions it
 * may take. An action with `ask` (or whose `askWhen` says so for that item) always goes to the owner; any other action runs on
 * its own only when the lane is On, Kaya agreed and the chef's confidence reaches the lane's floor. Every action runs the same
 * code staff use.
 */
import type { Mode } from './chef-names';
export { CHEFS, controlKey, modeOf, type Mode } from './chef-names';
export type Why = 'disagree' | 'weak' | 'no-to-member' | 'irreversible' | 'rule' | 'batch';
type Undo = Record<string, unknown>;
type LaneAction = {
  ask?: Why;
  /** Asks the owner for this particular item (e.g. an update that would replace a live recipe, or a recall on another batch). */
  askWhen?(db: PoolClient, target: string, input: Record<string, unknown>): Promise<Why | null>;
  run(db: PoolClient, actor: Actor, target: string, input: Record<string, unknown>, reason: string): Promise<{ note?: string; undo?: Undo }>;
  undo?(db: PoolClient, actor: Actor, target: string, undo: Undo, reason: string): Promise<void>;
};
export type Lane = {
  chef: string; title: string; capability: Capability; floor: number;
  /** Lanes about members' own content or words: Telegram gets `privateLabel` instead of the item's name, and no chef's reason. */
  member: boolean; privateLabel?: string;
  actions: Record<string, LaneAction>;
  /** What waits for the chef: only the fields it needs, never names of members. A paged lane returns `paged` items at a time,
   * in id order after `after`, so the chef can read all of them. */
  queue(mode: Mode, after?: string | null): Promise<Record<string, unknown>[]>;
  paged?: number;
  /** Public-safe names for items, for admin and (non-member lanes) Telegram: one query for many targets. */
  labels(targets: string[]): Promise<Record<string, string>>;
  /** What this lane hands to another chef, sent with the lane's work (Coco's triaged reports for Pandan). */
  handoff?(): Promise<Record<string, unknown>[]>;
};

const ingredient = (action: string): LaneAction['run'] => async (db, actor, target, input, reason) => {
  const done = await applyIngredient(db, actor, { ...input, id: target, action }, reason);
  return { note: done.reply.note, undo: done.undo };
};
const undoAnIngredient: LaneAction['undo'] = (db, actor, target, undo, reason) =>
  undoIngredient(db, actor, target, undo as Parameters<typeof undoIngredient>[3], reason);
const creator = (act: CreatorState): LaneAction['run'] => async (db, actor, target, _input, reason) => {
  const done = await applyCreatorState(db, actor, target, act, reason);
  return { note: done.reply.note, undo: done.undo };
};
const undoACreator: LaneAction['undo'] = (db, actor, target, undo, reason) =>
  undoCreatorState(db, actor, target, undo as Parameters<typeof undoCreatorState>[3], reason);
/**
 * A recipe an AI job wrote: its draft key is ai-<job id> of a job by the same account (none for wanted recipes, whose job and
 * recipe have no account). A key alone proves nothing, since members choose their own keys (the app refuses ai- keys from members:
 * server/recipes/rules.mjs), so members' words never reach the AI recipes lane, which has no privacy gate.
 */
const aiRecipe = (r: string) => `EXISTS (SELECT 1 FROM recipes.ai_job j WHERE j.user_id IS NOT DISTINCT FROM ${r}.author_id
  AND j.id = CASE WHEN ${r}.draft_key ~ '^ai-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN substr(${r}.draft_key, 4)::uuid END)`;
/** The AI recipes lane only ever touches recipes the AI wrote; the member recipes lane only members' own. */
const recipe = (ai: boolean, action: 'publish' | 'decline'): LaneAction['run'] => async (db, actor, target, input, reason) => {
  const mine = await db.query(`SELECT 1 FROM recipes.recipe r WHERE r.id::text=$1 AND ${ai ? '' : 'NOT '}${aiRecipe('r')}`, [target]);
  if (!mine.rowCount) throw new HttpError(409, ai ? 'This is not an AI recipe.' : 'This is not a member recipe.');
  const done = await applyMemberRecipe(db, actor, { ...input, id: target, action }, reason);
  return { note: done.reply.note, undo: done.undo ?? undefined };
};
const undoARecipe: LaneAction['undo'] = (db, actor, target, undo, reason) =>
  undoMemberRecipe(db, actor, target, undo as Parameters<typeof undoMemberRecipe>[3], reason);
/** Publishing an update replaces the live version, which cannot be brought back, so the owner decides those. */
const replacesLive: LaneAction['askWhen'] = async (db, target) =>
  (await db.query('SELECT 1 FROM recipes.recipe WHERE id::text=$1 AND live IS NOT NULL', [target])).rowCount ? 'irreversible' : null;
const post = (kind: 'review' | 'gathering'): LaneAction['run'] => async (db, actor, target, _input, reason) => {
  const done = await applyMemberPost(db, actor, kind, 'hide', target, reason);
  return { note: done.note, undo: done.undo ?? undefined };
};
const unhide = (kind: 'review' | 'gathering'): LaneAction['undo'] => async (db, actor, target, _undo, reason) => {
  await applyMemberPost(db, actor, kind, 'restore', target, reason);
};
const report = (act: 'triage' | 'dismiss' | 'resolve'): LaneAction['run'] => async (db, actor, target, input, reason) => {
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '';
  if (note.length < 5) throw new HttpError(400, 'Check note.');
  const done = await applyPlaceReport(db, actor, target, act, note, reason);
  return { note: done.note, undo: done.undo };
};
const undoAReport: LaneAction['undo'] = (db, actor, target, undo, reason) => undoPlaceReport(db, actor, target, undo as { status: string; prior?: string }, reason);
/** A recall match names the SFA notice it came from; only SFA's own notice pages are accepted. */
const BATCH = ['match', 'differs', 'unknown'] as const;
const recall: LaneAction['run'] = async (db, actor, target, input, reason) => {
  const notice = input.notice as { title?: unknown; url?: unknown } | undefined;
  const title = typeof notice?.title === 'string' ? notice.title.trim() : '', url = typeof notice?.url === 'string' ? notice.url : '';
  if (!title || title.length > 300 || !/^https:\/\/www\.sfa\.gov\.sg\/[\w\-/.%]{1,300}$/.test(url)) throw new HttpError(400, 'Check the notice.');
  const details = input.details === undefined ? '' : input.details, batch = input.batch ?? 'unknown';
  if (typeof details !== 'string' || details.length > 600 || !BATCH.includes(batch as never)) throw new HttpError(400, 'Check the notice.');
  const item = (await db.query<{ lot: string; date_mark: string | null }>(`SELECT lot, to_char(date_mark, 'YYYY-MM-DD') AS date_mark
    FROM market.listing WHERE id::text=$1 AND status IN ('active','paused')`, [target])).rows[0];
  if (!item) throw new HttpError(409, 'This item is no longer on sale.');
  const done = await fileRecallCase(db, actor, target, { title, url, details: details.trim(), batch: batch as typeof BATCH[number] }, item, reason);
  return { note: done.note, undo: done.undo };
};
// Mint's code found the pack's lot and date mark differ from every product the notice lists: likely another batch.
const otherBatch: LaneAction['askWhen'] = async (_db, _target, input) => input.batch === 'differs' ? 'batch' : null;
const demand = (action: 'make' | 'skip' | 'link'): LaneAction['run'] => async (db, actor, target, input, reason) => {
  const done = await applyDemand(db, actor, { ...input, id: target, action }, reason);
  return { note: done.reply.note, undo: done.undo };
};
const undoADemand: LaneAction['undo'] = (db, actor, target, undo, reason) =>
  undoDemand(db, actor, target, undo as Parameters<typeof undoDemand>[3], reason);
/**
 * Leaves out an item with an ask still open, or one decided, answered or undone in the last 7 days and not changed since. The
 * decision's latest time (made, answered or undone) is set in the same transaction as the change it caused, so that change does
 * not count as new; an item changed afterwards (a new AI match, a member's edit) comes back. Once a lane is On, what it only
 * watched comes back at once.
 */
const fresh = (lane: string, column: string, updated: string, mode: Mode) => `NOT EXISTS (SELECT 1 FROM ops.chef_decision cd_
  WHERE cd_.lane = '${lane}' AND cd_.target = ${column} AND (cd_.outcome = 'asked' OR (coalesce(cd_.decided_at, cd_.created_at) > now() - interval '7 days'
    AND coalesce(cd_.decided_at, cd_.created_at) >= ${updated}${mode === 'on' ? " AND cd_.outcome <> 'watched'" : ''})))`;
/** Most triaged place reports handed over at once; a longer list says it was cut. */
export const HANDOFF = 1000;
/** A creator that needs no change this week: recorded, nothing touched. */
const keep: LaneAction = { run: async () => ({ note: 'No change' }) };
/** Labels for many targets in one query: `sql` selects (id, label) for ids in $1. */
const labelled = (sql: string, prefix = '') => async (targets: string[]) => Object.fromEntries((await query<{ id: string; label: string | null }>(sql, [targets]))
  .rows.map(r => [r.id, prefix + (r.label ?? r.id)]));
const recipeTitles = labelled("SELECT id::text AS id, coalesce(pending, live)->>'title' AS label FROM recipes.recipe WHERE id::text = ANY($1)");

export const LANES: Record<string, Lane> = {
  ingredients: {
    chef: 'wok', title: 'Ingredients', capability: 'content', floor: 0.8, member: false,
    actions: {
      approve: { run: ingredient('approve'), undo: undoAnIngredient },
      retry: { run: ingredient('retry'), undo: undoAnIngredient },
      reject: { ask: 'rule', run: ingredient('reject'), undo: undoAnIngredient },
    },
    queue: async mode => (await query(`SELECT i.name_key AS id, i.name, i.usda, i.usda_name, i.negligible, i.g_per_ml::float AS g_per_ml, i.units,
        i.confidence, i.reason, i.updated_at::text AS version, f.name AS food_name, f.per100,
        (SELECT count(*)::int FROM nutrition.recipe_ingredient ri WHERE ri.name_key = i.name_key) AS recipes
      FROM nutrition.ingredient i LEFT JOIN nutrition.food f ON f.id = i.food_id
      WHERE i.status = 'auto' AND ${fresh('ingredients', 'i.name_key', 'i.updated_at', mode)}
      ORDER BY recipes DESC, i.updated_at LIMIT 20`)).rows,
    labels: labelled('SELECT name_key AS id, name AS label FROM nutrition.ingredient WHERE name_key = ANY($1)'),
  },
  creators: {
    chef: 'wok', title: 'Creators', capability: 'content', floor: 0.8, member: false,
    actions: { pin: { run: creator('pin'), undo: undoACreator }, unpin: { run: creator('unpin'), undo: undoACreator },
      pause: { run: creator('pause'), undo: undoACreator }, activate: { run: creator('activate'), undo: undoACreator },
      block: { ask: 'rule', run: creator('block'), undo: undoACreator }, keep },
    queue: async mode => (await query(`SELECT c.id, c.name, c.kind, c.region, c.status, c.pinned, c.found_by, s.passed, s.published, s.held, s.rejected,
        s.coverage::float AS coverage, s.last_published, c.updated_at
      FROM creators.creator c JOIN creators.score s ON s.creator_id = c.id
      WHERE c.status IN ('active', 'paused') AND ${fresh('creators', 'c.id', 'c.updated_at', mode)}
      ORDER BY c.updated_at LIMIT 20`)).rows,
    labels: labelled('SELECT id, name AS label FROM creators.creator WHERE id = ANY($1)'),
  },
  'game-levels': {
    chef: 'artist', title: 'Game levels', capability: 'content', floor: 0.8, member: true, privateLabel: 'a recipe level',
    actions: { approve: { run: async (db, actor, target, _input, reason) => {
      const done = await applyGameLevel(db, actor, target, 'approve', reason);
      return { note: done.reply.note, undo: done.undo ?? undefined };
    }, undo: (db, actor, target, undo, reason) => undoGameLevel(db, actor, target, undo as { version: string }, reason) } },
    queue: async mode => (await query(`SELECT l.hash AS id, l.recipe_id, l.recipe_revision, l.created_at, l.pack, l.owner_id IS NOT NULL AS members_recipe
      FROM game.recipe_level l WHERE l.status = 'review' AND ${fresh('game-levels', 'l.hash', 'l.created_at', mode)} ORDER BY l.created_at LIMIT 10`)).rows,
    labels: labelled("SELECT hash AS id, pack->'dishes'->0->>'name' AS label FROM game.recipe_level WHERE hash = ANY($1)"),
  },
  'ai-recipes': {
    chef: 'writer', title: 'AI recipes', capability: 'content', floor: 0.85, member: true, privateLabel: 'an AI recipe',
    actions: { publish: { askWhen: replacesLive, run: recipe(true, 'publish'), undo: undoARecipe },
      decline: { ask: 'no-to-member', run: recipe(true, 'decline'), undo: undoARecipe } },
    queue: async mode => (await query(`SELECT r.id, r.pending_revision AS revision, r.pending AS recipe, r.updated_at
      FROM recipes.recipe r WHERE r.pending_state = 'review' AND ${aiRecipe('r')} AND ${fresh('ai-recipes', 'r.id::text', 'r.updated_at', mode)}
      ORDER BY r.updated_at LIMIT 10`)).rows,
    labels: recipeTitles,
  },
  wanted: {
    chef: 'writer', title: 'Wanted recipes', capability: 'content', floor: 0.75, member: true, privateLabel: 'a wanted recipe',
    actions: { make: { run: demand('make'), undo: undoADemand }, link: { run: demand('link'), undo: undoADemand },
      skip: { ask: 'rule', run: demand('skip'), undo: undoADemand } },
    queue: async mode => (await query(`SELECT d.term AS id, d.searches, d.searchers, d.results, d.failures, d.first_seen, d.last_seen
      FROM recipes.demand d WHERE d.status = 'open' AND ${fresh('wanted', 'd.term', 'd.updated_at', mode)}
      ORDER BY d.searchers DESC, d.last_seen DESC LIMIT 20`)).rows,
    labels: async targets => Object.fromEntries(targets.map(t => [t, t])),
  },
  'member-recipes': {
    chef: 'writer', title: 'Member recipes', capability: 'content', floor: 0.9, member: true, privateLabel: "a member's recipe",
    actions: { publish: { askWhen: replacesLive, run: recipe(false, 'publish'), undo: undoARecipe },
      decline: { ask: 'no-to-member', run: recipe(false, 'decline'), undo: undoARecipe } },
    queue: async mode => (await query(`SELECT r.id, r.pending_revision AS revision, r.pending AS recipe, r.updated_at
      FROM recipes.recipe r WHERE r.pending_state = 'review' AND NOT ${aiRecipe('r')} AND ${fresh('member-recipes', 'r.id::text', 'r.updated_at', mode)}
      ORDER BY r.updated_at LIMIT 10`)).rows,
    labels: recipeTitles,
  },
  reviews: {
    chef: 'fixer', title: 'Place reviews', capability: 'content', floor: 0.9, member: true, privateLabel: 'a place review',
    actions: { hide: { ask: 'no-to-member', run: post('review'), undo: unhide('review') } },
    // Only reviews written or edited in the last two days: each pass checks the new ones against the written rules.
    queue: async mode => (await query(`SELECT pr.id, pr.rating, pr.body, pr.updated_at FROM community.place_review pr
      WHERE pr.hidden_at IS NULL AND pr.updated_at > now() - interval '2 days' AND ${fresh('reviews', 'pr.id::text', 'pr.updated_at', mode)}
      ORDER BY pr.updated_at DESC LIMIT 100`)).rows,
    labels: async targets => Object.fromEntries(targets.map(t => [t, 'Place review'])),
  },
  'place-reports': {
    chef: 'fixer', title: 'Place reports', capability: 'cases', floor: 0.8, member: true, privateLabel: 'a place report',
    // Closing a report is staff's call: Coco only suggests it once Pandan's recheck is settled (chef_work.suggest_resolutions).
    actions: { triage: { run: report('triage'), undo: undoAReport }, dismiss: { ask: 'no-to-member', run: report('dismiss'), undo: undoAReport },
      resolve: { ask: 'rule', run: report('resolve'), undo: undoAReport } },
    // The reporter (subject_id after "|by:") is never read here.
    queue: async mode => (await query(`SELECT c.id, split_part(substr(c.subject_id, 17), '|by:', 1) AS place_id, c.title, c.description, c.created_at
      FROM ops.case_record c WHERE c.status = 'open' AND c.kind = 'report' AND c.subject_id LIKE 'place:catalogue:%'
        AND ${fresh('place-reports', 'c.id::text', 'c.updated_at', mode)} ORDER BY c.created_at LIMIT 10`)).rows,
    labels: labelled("SELECT id::text AS id, split_part(substr(subject_id, 17), '|by:', 1) AS label FROM ops.case_record WHERE id::text = ANY($1)", 'Place report · '),
    // Triaged by Coco or by the owner answering Coco, and still triaged however long a fix takes: Pandan's recheck list and the
    // reports Coco may suggest closing, once each with the latest triage and chef note. The bot treats a report missing from a
    // complete list as closed, so the list says when it is cut (HANDOFF).
    handoff: async () => (await query(`SELECT * FROM (SELECT DISTINCT ON (c.id) c.id AS case, split_part(substr(c.subject_id, 17), '|by:', 1) AS place,
        n.body AS note, d.created_at AS at
      FROM ops.chef_decision d JOIN ops.case_record c ON c.id::text = d.target
      LEFT JOIN LATERAL (SELECT body FROM ops.case_bot_note b WHERE b.case_id = c.id ORDER BY b.created_at DESC LIMIT 1) n ON true
      WHERE d.lane = 'place-reports' AND d.action = 'triage' AND d.outcome IN ('done', 'approved') AND c.status = 'triaged'
      ORDER BY c.id, d.created_at DESC) h ORDER BY h.at LIMIT ${HANDOFF}`)).rows,
  },
  recalls: {
    chef: 'safety', title: 'Recall matches', capability: 'sellers', floor: 0.7, member: true, privateLabel: 'a Market item', paged: 200,
    actions: { file: { askWhen: otherBatch, run: recall, undo: (db, actor, _target, undo, reason) => undoRecallCase(db, actor, undo as { case: string }, reason) } },
    // Every sealed pack on sale or paused, 200 at a time: what an SFA recall can apply to. Short text only, so packs fit a prompt; no
    // seller details. The date mark goes out as text, so Mint compares the date the seller entered whatever the server's time zone;
    // the version tells Mint when a pack changed and must be checked again.
    queue: async (_mode, after) => (await query(`SELECT l.id, l.name, l.category, left(l.description, 160) AS description, left(l.ingredients, 240) AS ingredients,
        l.lot, to_char(l.date_mark, 'YYYY-MM-DD') AS date_mark, l.updated_at::text AS version FROM market.listing l
      WHERE l.kind = 'prepacked' AND l.status IN ('active', 'paused') AND ($1::text IS NULL OR l.id::text > $1) ORDER BY l.id::text LIMIT 200`, [after ?? null])).rows,
    labels: labelled('SELECT id::text AS id, name AS label FROM market.listing WHERE id::text = ANY($1)', 'Market item · '),
  },
  gatherings: {
    chef: 'host', title: 'Gatherings', capability: 'content', floor: 0.9, member: true, privateLabel: 'a gathering',
    actions: { hide: { ask: 'no-to-member', run: post('gathering'), undo: unhide('gathering') } },
    queue: async mode => (await query(`SELECT g.id, g.title, g.area, g.venue, g.food, g.updated_at FROM social.gathering g
      WHERE g.hidden_at IS NULL AND g.state <> 'draft' AND g.updated_at > now() - interval '2 days' AND ${fresh('gatherings', 'g.id::text', 'g.updated_at', mode)}
      ORDER BY g.updated_at DESC LIMIT 100`)).rows,
    labels: labelled('SELECT id::text AS id, title AS label FROM social.gathering WHERE id::text = ANY($1)'),
  },
};
