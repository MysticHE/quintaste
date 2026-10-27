import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit, type Actor } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, pageSize, text } from './http';
import { search } from './content-members';

// Creator library (server/creators, docs/COOKER_CREATOR_LIBRARY_PLAN.md): the recipe creators QT Cooker searches first, their public
// channels and the recipe pages it looked at. Staff add and edit creators, pause or block them, pin the best and mark who may be
// invited later (outreach needs the owner's approval). The bot writes recipe pages only through its signed routes.
const views = { active: "c.status = 'active'", paused: "c.status = 'paused'", blocked: "c.status = 'blocked'", invite: "c.invite = 'ready'" } as const;
export const PLATFORMS = ['website', 'youtube', 'instagram', 'tiktok', 'facebook', 'xiaohongshu', 'pinterest', 'other'] as const;
const DIETS = ['vegan', 'vegetarian', 'five-pungent-free', 'buddhist', 'jain'] as const;
const missing = (error: unknown) => ['42P01', '3F000'].includes((error as { code?: string })?.code ?? '');
const notInstalled = () => new HttpError(503, 'The creator library is not installed on this server yet.');

export async function creatorList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const view = choice(status || 'active', Object.keys(views) as (keyof typeof views)[], 'status'), term = search(q);
  try {
    return (await query(`SELECT c.id, c.name, c.kind, c.country, c.region, c.languages, c.diets, c.cuisines, c.website, c.status, c.pinned,
        c.invite, c.note, c.found_by, c.updated_at, s.passed, s.published, s.held, s.rejected, s.coverage::float AS coverage, s.last_published,
        coalesce((SELECT json_agg(json_build_object('platform', ch.platform, 'handle', ch.handle, 'url', ch.url, 'followers', ch.followers,
            'checked_at', ch.checked_at) ORDER BY ch.platform) FROM creators.channel ch WHERE ch.creator_id = c.id), '[]') AS channels,
        coalesce((SELECT json_agg(r ORDER BY r.last_seen DESC) FROM (SELECT url, name, status, recipe_id, coverage::float AS coverage, last_seen
            FROM creators.recipe_source WHERE creator_id = c.id ORDER BY last_seen DESC LIMIT 5) r), '[]') AS sources
      FROM creators.creator c JOIN creators.score s ON s.creator_id = c.id
      WHERE ${views[view]} AND ($1 = '' OR c.name ILIKE $1 OR c.id ILIKE $1 OR EXISTS (SELECT 1 FROM creators.channel ch WHERE ch.creator_id = c.id AND ch.handle ILIKE $1))
      ORDER BY c.pinned DESC, array_position(ARRAY['singapore','asia','world'], c.region), s.published DESC, s.passed DESC, c.name
      LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows;
  } catch (error) {
    if (missing(error)) throw notInstalled();
    throw error;
  }
}

const httpsUrl = (value: unknown, name: string, max = 300) => {
  const url = text(value, name, max, 9);
  try { if (new URL(url).protocol === 'https:' && !/\s/.test(url)) return url; } catch { /* below */ }
  throw new HttpError(400, `Check ${name}: use a full https:// link.`);
};
const optionalUrl = (value: unknown, name: string) => value === undefined || value === null || value === '' ? null : httpsUrl(value, name);
function list<T extends string>(value: unknown, name: string, max: number, allowed?: readonly T[]) {
  if (value === undefined) return [] as string[];
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  if (!items) throw new HttpError(400, `Check ${name}.`);
  const out = [...new Set(items.map(item => text(item, name, 40).toLowerCase()))];
  if (out.length > max || (allowed && out.some(item => !allowed.includes(item as T)))) throw new HttpError(400, `Check ${name}.`);
  return out;
}
const slug = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** The editable fields of a creator, checked like the database does. */
function fields(input: Record<string, unknown>) {
  const country = input.country === undefined || input.country === '' || input.country === null ? null : text(input.country, 'country', 2, 2).toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'Check country: use a two-letter code such as SG.');
  return { name: text(input.name, 'name', 120), kind: choice(input.kind ?? 'person', ['person', 'organisation'] as const, 'kind'), country,
    region: choice(input.region ?? 'world', ['singapore', 'asia', 'world'] as const, 'region'), languages: list(input.languages, 'languages', 6),
    diets: list(input.diets, 'diets', 5, DIETS), cuisines: list(input.cuisines, 'cuisines', 8), website: optionalUrl(input.website, 'website'),
    note: input.note === undefined ? '' : text(input.note, 'note', 500, 0) };
}

/** create / edit a creator; pin, unpin, pause, activate, block; invite (not-yet, ready, invited, declined); channel adds or updates one
 * public account; remove-channel deletes one. Every change is audited. */
export async function creatorAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, ['create', 'edit', 'pin', 'unpin', 'pause', 'activate', 'block', 'invite', 'channel', 'remove-channel'] as const, 'action');
  authorize(member, 'content');
  try {
    return await transaction(async db => {
      await lockPermission(db, member, 'content');
      if (act === 'create') {
        const f = fields(input), id = slug(f.name);
        if (id.length < 3) throw new HttpError(400, 'Use a name with at least three letters or numbers.');
        const made = await db.query(`INSERT INTO creators.creator (id, name, kind, country, region, languages, diets, cuisines, website, note, found_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'staff') ON CONFLICT (id) DO NOTHING`,
          [id, f.name, f.kind, f.country, f.region, f.languages, f.diets, f.cuisines, f.website, f.note]);
        if (!made.rowCount) throw new HttpError(409, 'A creator with this name is already in the library.');
        if (f.website) await db.query(`INSERT INTO creators.channel (creator_id, platform, handle, url, checked_by) VALUES ($1,'website',$2,$3,'staff')
          ON CONFLICT DO NOTHING`, [id, f.website.replace(/^https:\/\//, '').replace(/\/+$/, ''), f.website]);
        await audit(db, member.id, 'content.creator.create', 'creator:' + id, reason, { name: f.name });
        return { saved: true, id, note: 'Added to the library' };
      }
      const id = text(input.id, 'creator', 80, 3);
      if (act === 'channel' || act === 'remove-channel') {
        const platform = choice(input.platform, PLATFORMS, 'platform'), handle = text(input.handle, 'handle', 120).replace(/^@/, '');
        const exists = await db.query('SELECT 1 FROM creators.creator WHERE id=$1 FOR UPDATE', [id]);
        if (!exists.rowCount) throw new HttpError(404, 'This creator is no longer in the library.');
        if (act === 'remove-channel') {
          const gone = await db.query('DELETE FROM creators.channel WHERE creator_id=$1 AND platform=$2 AND handle=$3', [id, platform, handle]);
          if (!gone.rowCount) throw new HttpError(409, 'This channel changed since you opened it. Refresh the list.');
        } else {
          const followers = input.followers === undefined || input.followers === '' || input.followers === null ? null : integer(input.followers, 'followers', 0, 2_000_000_000);
          await db.query(`INSERT INTO creators.channel (creator_id, platform, handle, url, followers, checked_at, checked_by) VALUES ($1,$2,$3,$4,$5,now(),'staff')
            ON CONFLICT (creator_id, platform, handle) DO UPDATE SET url=EXCLUDED.url, followers=coalesce(EXCLUDED.followers, creators.channel.followers),
              checked_at=now(), checked_by='staff'`, [id, platform, handle, httpsUrl(input.url, 'link'), followers]);
        }
        await db.query('UPDATE creators.creator SET updated_at=now() WHERE id=$1', [id]);
        await audit(db, member.id, 'content.creator.' + act, 'creator:' + id, reason, { platform, handle });
        return { saved: true, note: act === 'channel' ? 'Channel saved' : 'Channel removed' };
      }
      if (act in STATES) return (await applyCreatorState(db, { id: member.id }, id, act as CreatorState, reason)).reply;
      const set = act === 'edit' ? (() => { const f = fields(input);
          return { sql: 'name=$2, kind=$3, country=$4, region=$5, languages=$6, diets=$7, cuisines=$8, website=$9, note=$10',
            values: [f.name, f.kind, f.country, f.region, f.languages, f.diets, f.cuisines, f.website, f.note] }; })()
        : act === 'invite' ? { sql: 'invite=$2', values: [choice(input.invite, ['not-yet', 'ready', 'invited', 'declined'] as const, 'invite')] }
        : null;
      if (!set) throw new HttpError(400, 'Check action.');
      const result = await db.query(`UPDATE creators.creator SET ${set.sql}, updated_at=now() WHERE id=$1`, [id, ...set.values]);
      if (!result.rowCount) throw new HttpError(404, 'This creator is no longer in the library.');
      await audit(db, member.id, 'content.creator.' + act, 'creator:' + id, reason, act === 'invite' ? { invite: set.values[0] } : {});
      return { saved: true, note: 'Saved' };
    });
  } catch (error) {
    if (missing(error)) throw notInstalled();
    throw error;
  }
}

const STATES = { pin: 'pinned=true', unpin: 'pinned=false', pause: "status='paused'", activate: "status='active'", block: "status='blocked', pinned=false" } as const;
const STATE_NOTES = { pin: 'Pinned: searched first', unpin: 'Unpinned', pause: 'Paused: not searched', activate: 'Active again', block: 'Blocked: never searched' };
export type CreatorState = keyof typeof STATES;
type Prior = { status: string; pinned: boolean };
/** Pin, unpin, pause, reactivate or block a creator, by staff or a chef (docs/ADMIN_CHEFS_PLAN.md); returns the creator as it was. */
export async function applyCreatorState(db: PoolClient, actor: Actor, id: string, act: CreatorState, reason: string) {
  const prior = (await db.query<Prior>('SELECT status, pinned FROM creators.creator WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!prior) throw new HttpError(404, 'This creator is no longer in the library.');
  const after = (await db.query<{ version: string }>(`UPDATE creators.creator SET ${STATES[act]}, updated_at=now() WHERE id=$1
    RETURNING updated_at::text AS version`, [id])).rows[0];
  await audit(db, actor.id, 'content.creator.' + act, 'creator:' + id, reason, {}, actor.bot);
  return { reply: { saved: true, note: STATE_NOTES[act] }, undo: { prior, version: after.version } };
}
/** Puts a creator back as it was before a chef's change, unless someone changed it since. */
export async function undoCreatorState(db: PoolClient, actor: Actor, id: string, undo: { prior: Prior; version: string }, reason: string) {
  const done = await db.query('UPDATE creators.creator SET status=$3, pinned=$4, updated_at=now() WHERE id=$1 AND updated_at::text=$2',
    [id, undo.version, undo.prior.status, undo.prior.pinned]);
  if (!done.rowCount) throw new HttpError(409, 'This creator changed since the chef decided. Nothing was undone.');
  await audit(db, actor.id, 'content.creator.undo', 'creator:' + id, reason, { restored: undo.prior }, actor.bot);
}
