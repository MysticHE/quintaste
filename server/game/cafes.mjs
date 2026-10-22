import { CommunityError } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { allowed } from '../operations.mjs';
import { authorVisible } from './visibility.mjs';

/**
 * Member cafés (GAME_CONTENT_PLAN §9, Phase 5; RECIPE_LEVELS_PLAN §4, §9, §10): a member opens their café, names it and puts up to
 * six reviewed (public) recipe levels on its menu; other members visit and play a service of it (mission.ts cafeFor). Hosts get no
 * rewards for visitors and see private weekly counts only. Off behind the `game_cafes` control until the owner sets the terms wording
 * and the published contact details.
 */
export const CAFE_TERMS_VERSION = 1;
export const MENU_MAX = 6;
// Links, emails and phone numbers stay off café names (the Market rule, server/market/rules.mjs).
const CONTACT = /https?:\/\/|www\.|\bt\.me\/|\bwa\.me\/|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b|(?:\+?65[\s-]?)?\b[3689]\d{3}[\s-]?\d{4}\b|\.(?:com|sg|net|org)\b/i;
const PACK_HASH = /^p[a-z0-9]{1,14}$/;

/** Cafés are on only while staff have both the game and cafés on (fail closed). */
export const cafesOn = async () => await allowed('game_cafes') && await allowed('games');
export async function requireCafes() {
  if (!await cafesOn()) throw new CommunityError(503, 'Cafés are not open yet.', 'SERVICE_PAUSED');
}
/** A reviewed level anyone may play: live, public, and from a recipe that is still shown (and not blocked for `viewer`). */
const publicLevel = (alias, viewer) => `${alias}.status = 'ready' AND ${alias}.owner_id IS NULL AND ${authorVisible(alias, viewer)}`;

/** Whether a member may visit this host's café now: open, not hidden, the host not restricted and no block either way. */
const visitable = (alias, viewer) => `${alias}.open AND ${alias}.hidden_at IS NULL AND ${alias}.user_id <> ${viewer} AND ${notRestricted(alias + '.user_id')}
  AND ${notBlocked(alias + '.user_id', viewer)}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A café's public id (game.cafe.public_id) as the app sends it, or null. Hosts' account ids are never sent to visitors. */
export const cafeId = value => typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : null;

/**
 * The member's own café: its name, whether it is open, the menu, the terms they accepted and this week's private counts. The menu lists
 * only dishes still playable, so a level withdrawn or replaced since it was saved drops off and the next save goes through.
 */
export async function myCafe(db, me) {
  const cafe = (await db.query('SELECT name, open, terms_version, hidden_at IS NOT NULL AS hidden FROM game.cafe WHERE user_id = $1', [me])).rows[0] ?? null;
  const menu = (await db.query(`SELECT m.hash, l.recipe_id, l.pack->'dishes'->0->>'name' AS name FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash
    WHERE m.user_id = $1 AND ${publicLevel('l', '$1')} ORDER BY m.position`, [me])).rows;
  const week = (await db.query(`SELECT count(*)::int AS visits, count(*) FILTER (WHERE served)::int AS served FROM game.cafe_visit
    WHERE host_id = $1 AND created_at > now() - interval '7 days'`, [me])).rows[0];
  return { cafe: cafe && { name: cafe.name, open: cafe.open, hidden: cafe.hidden, termsAccepted: cafe.terms_version === CAFE_TERMS_VERSION },
    menu: menu.map(m => ({ hash: m.hash, recipeId: m.recipe_id, name: m.name })), week, terms: CAFE_TERMS_VERSION };
}

/**
 * Saves the member's café: its name, the menu (up to six reviewed levels) and whether it is open. Opening needs the current terms. A dish
 * that is no longer playable (withdrawn or replaced since the member loaded the menu) is left off rather than refusing the save.
 */
export async function saveCafe(db, me, body) {
  const name = String(body?.name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 30) throw new CommunityError(400, 'Give your café a name of up to 30 characters.');
  if (CONTACT.test(name)) throw new CommunityError(400, "A café name can't include links, emails or phone numbers.");
  const asked = Array.isArray(body?.menu) ? [...new Set(body.menu.filter(h => typeof h === 'string' && PACK_HASH.test(h)))] : [];
  if (asked.length > MENU_MAX) throw new CommunityError(400, 'A café menu holds up to six dishes.');
  const ok = new Set(asked.length ? (await db.query(`SELECT l.hash FROM game.recipe_level l WHERE l.hash = ANY($1) AND ${publicLevel('l', '$2')}`, [asked, me])).rows.map(r => r.hash) : []);
  const menu = asked.filter(h => ok.has(h));
  const open = body?.open === true;
  await db.query('INSERT INTO game.profile(user_id) VALUES($1) ON CONFLICT DO NOTHING', [me]);
  const before = (await db.query('SELECT terms_version, hidden_at FROM game.cafe WHERE user_id = $1 FOR UPDATE', [me])).rows[0];
  if (before?.hidden_at && open) throw new CommunityError(403, 'Staff closed your café after a report. Contact QuinTaste support to reopen it.', 'CAFE_HIDDEN');
  const terms = body?.terms === CAFE_TERMS_VERSION ? CAFE_TERMS_VERSION : before?.terms_version ?? null;
  if (open && terms !== CAFE_TERMS_VERSION) throw new CommunityError(409, 'Accept the café terms to open your café.', 'TERMS_REQUIRED');
  if (open && !menu.length) throw new CommunityError(400, 'Put at least one dish on your menu to open your café.');
  await db.query(`INSERT INTO game.cafe(user_id, name, open, terms_version, terms_at, opened_at) VALUES($1,$2,$3,$4,CASE WHEN $4::smallint IS NULL THEN NULL ELSE now() END,CASE WHEN $3 THEN now() END)
    ON CONFLICT (user_id) DO UPDATE SET name = $2, open = $3, terms_version = $4,
      terms_at = CASE WHEN game.cafe.terms_version IS DISTINCT FROM $4 THEN now() ELSE game.cafe.terms_at END,
      opened_at = CASE WHEN $3 AND NOT game.cafe.open THEN now() ELSE game.cafe.opened_at END, updated_at = now()`, [me, name, open, terms]);
  await db.query('DELETE FROM game.cafe_menu WHERE user_id = $1', [me]);
  for (const [i, hash] of menu.entries()) await db.query('INSERT INTO game.cafe_menu(user_id, position, hash) VALUES($1,$2,$3)', [me, i + 1, hash]);
  return myCafe(db, me);
}

/**
 * Open cafés a member may visit: never their own, hidden, a restricted host's or one blocked either way; only cafés with at least one
 * dish still playable. `q` searches café names and dishes. Busiest first this week (the counts themselves are never shown).
 */
export async function listCafes(db, me, q) {
  const term = typeof q === 'string' && q.trim() ? '%' + q.trim().slice(0, 40).replace(/[\\%_]/g, c => '\\' + c) + '%' : '';
  const rows = (await db.query(`SELECT c.public_id AS host, c.name,
      (SELECT array_agg(l.pack->'dishes'->0->>'name' ORDER BY m.position) FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash
        WHERE m.user_id = c.user_id AND ${publicLevel('l', '$1')}) AS dishes
    FROM game.cafe c
    WHERE ${visitable('c', '$1')}
      AND EXISTS (SELECT 1 FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash WHERE m.user_id = c.user_id AND ${publicLevel('l', '$1')})
      AND ($2 = '' OR c.name ILIKE $2 OR EXISTS (SELECT 1 FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash
        WHERE m.user_id = c.user_id AND l.pack->'dishes'->0->>'name' ILIKE $2))
    ORDER BY (SELECT count(*) FROM game.cafe_visit v WHERE v.host_id = c.user_id AND v.created_at > now() - interval '7 days') DESC, c.opened_at DESC
    LIMIT 30`, [me, term])).rows;
  return rows.map(r => ({ host: r.host, name: r.name, dishes: (r.dishes ?? []).filter(Boolean) }));
}

/**
 * A café a member may visit, by its public id, with its menu's level packs (validated and registered with the simulation) in menu
 * order. `host` is the public id; `hostId` the host's account (server only). Null when the café is closed, hidden, the visitor's own,
 * blocked, or has nothing playable left.
 */
export async function visitableCafe(db, sim, publicId, me) {
  const id = cafeId(publicId);
  if (!id) return null;
  const cafe = (await db.query(`SELECT c.user_id, c.name FROM game.cafe c WHERE c.public_id = $1::uuid AND ${visitable('c', '$2')}`, [id, me])).rows[0];
  if (!cafe) return null;
  const rows = (await db.query(`SELECT l.hash, l.pack, l.recipe_id FROM game.cafe_menu m JOIN game.recipe_level l ON l.hash = m.hash
    WHERE m.user_id = $1 AND ${publicLevel('l', '$2')} ORDER BY m.position`, [cafe.user_id, me])).rows;
  const packs = [];
  for (const row of rows) {
    try {
      const pack = sim.readPack(row.pack);
      if (sim.packHash(pack) !== row.hash) continue;
      sim.registerPack(pack);
      packs.push({ hash: row.hash, pack: row.pack, recipeId: row.recipe_id, techniques: pack.techniques });
    } catch (error) { if (!(error instanceof sim.PackError)) throw error; }
  }
  return packs.length ? { host: id, hostId: cafe.user_id, name: cafe.name, packs } : null;
}

/**
 * A café run's host now (at settle, inside its transaction): null when the café is gone (the host deleted their account), otherwise
 * whether the visitor may still visit it. The row is held so it cannot be deleted before the visit is recorded.
 */
export async function cafeNow(db, hostId, me) {
  const row = (await db.query(`SELECT (${visitable('c', '$2')}) AS visitable FROM game.cafe c WHERE c.user_id = $1 FOR KEY SHARE OF c`, [hostId, me])).rows[0];
  return row ? { visitable: row.visitable } : null;
}