import express from 'express';
import { pool } from '../config.mjs';
import { createHash } from 'node:crypto';
import { json, raw, signed } from '../bot-signature.mjs';

/**
 * Routes QT Cooker calls (ops/qt-team/creators_client.py) for the creator library (docs/COOKER_CREATOR_LIBRARY_PLAN.md):
 * read the creators to search first and the pages already written up, and record the recipe pages it looked at. Signed like the
 * other bot routes; nothing here publishes.
 */
export const creatorBots = express.Router();
const PLATFORMS = ['website', 'youtube', 'instagram', 'tiktok', 'facebook', 'xiaohongshu', 'pinterest', 'other'];
const STATUSES = ['shortlisted', 'rejected', 'drafted', 'held', 'published', 'withdrawn'];
const RECIPE_ID = /^[a-z0-9][a-z0-9-]{2,119}$/;
const MAX_SOURCES = 50;
const missing = error => error?.code === '42P01' || error?.code === '3F000';

/** The same key as ops/qt-team/recipe_quality.page_key: host without www, path without a trailing slash, no query or fragment. */
export function pageKey(url) {
  const u = new URL(url);
  let path = u.pathname;
  try { path = decodeURI(path); } catch { /* keep it encoded */ }
  return u.hostname.toLowerCase().replace(/^www\./, '') + path.replace(/\/+$/, '');
}
const httpsUrl = (value, max) => typeof value === 'string' && value.length <= max && /^https:\/\/[^\s]+$/.test(value) && (() => { try { return !!new URL(value).hostname; } catch { return false; } })();
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';

/** A source row from the bot, or null when it is malformed (the call then fails as a whole, so nothing is half-recorded). */
export function readSource(s) {
  if (!s || typeof s !== 'object' || !httpsUrl(s.url, 600) || !STATUSES.includes(s.status)) return null;
  if (s.recipeId != null && !RECIPE_ID.test(s.recipeId)) return null;
  if (s.coverage != null && !(typeof s.coverage === 'number' && s.coverage >= 0 && s.coverage <= 1)) return null;
  const key = pageKey(s.url);
  if (key.length < 3 || key.length > 400) return null;
  return { key, url: s.url, platform: PLATFORMS.includes(s.platform) ? s.platform : 'website', name: clean(s.name, 160), recipeId: s.recipeId ?? null,
    status: s.status, reasons: Array.isArray(s.reasons) ? s.reasons.filter(r => typeof r === 'string').slice(0, 8).map(r => clean(r, 200)) : [],
    coverage: s.coverage ?? null };
}

/** Active creators with their channels and track record, best first; pages already written up; hosts of blocked creators. */
creatorBots.post('/library', raw('1kb'), signed, async (_req, res, next) => {
  try {
    const creators = (await pool.query(`SELECT c.id, c.name, c.kind, c.region, c.diets, c.cuisines, c.website, c.pinned,
        coalesce(json_agg(json_build_object('platform', ch.platform, 'handle', ch.handle, 'url', ch.url, 'followers', ch.followers, 'checked_at', ch.checked_at))
          FILTER (WHERE ch.creator_id IS NOT NULL), '[]') AS channels,
        s.passed, s.published, s.held, s.rejected, s.coverage
      FROM creators.creator c LEFT JOIN creators.channel ch ON ch.creator_id = c.id JOIN creators.score s ON s.creator_id = c.id
      WHERE c.status = 'active'
      GROUP BY c.id, s.passed, s.published, s.held, s.rejected, s.coverage
      ORDER BY c.pinned DESC, array_position(ARRAY['singapore','asia','world'], c.region), s.published DESC, s.passed DESC, c.name
      LIMIT 500`)).rows;
    const written = (await pool.query(`SELECT page_key, recipe_id, name, status FROM creators.recipe_source
      WHERE status IN ('drafted','held','published','withdrawn') ORDER BY last_seen DESC LIMIT 3000`)).rows;
    const blocked = (await pool.query(`SELECT DISTINCT lower(regexp_replace(substring(u FROM '^https://([^/]+)'), '^www\\.', '')) AS host
      FROM creators.creator c, LATERAL (SELECT c.website AS u UNION SELECT url FROM creators.channel WHERE creator_id = c.id) urls
      WHERE c.status = 'blocked' AND u IS NOT NULL`)).rows.map(r => r.host).filter(Boolean);
    res.json({ creators, written, blocked });
  } catch (error) {
    if (missing(error)) return res.status(503).json({ error: 'Creator library not installed' });
    next(error);
  }
});

const REGIONS = ['singapore', 'asia', 'world'];
const DIETS = ['vegan', 'vegetarian', 'five-pungent-free', 'buddhist', 'jain'];
const MAX_CREATORS = 40, MAX_CHANNELS = 200;
const slug = name => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const words = (value, max, allowed) => Array.isArray(value)
  ? [...new Set(value.filter(v => typeof v === 'string').map(v => clean(v, 40).toLowerCase()).filter(v => v && (!allowed || allowed.includes(v))))].slice(0, max) : [];
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 2_000_000_000 ? value : null;
/** The host and path of a link without www or a trailing slash: how channels and pages are matched to a creator. */
const linkKey = url => { try { const u = new URL(url); return u.hostname.toLowerCase().replace(/^www\./, '') + u.pathname.replace(/\/+$/, ''); } catch { return ''; } };

/** A channel from the scout, or null when malformed. */
export function readChannel(c) {
  if (!c || typeof c !== 'object' || !PLATFORMS.includes(c.platform) || !httpsUrl(c.url, 300)) return null;
  const handle = clean(c.handle, 120).replace(/^@/, '') || linkKey(c.url).split('/').filter(Boolean).pop() || '';
  if (!handle) return null;
  return { platform: c.platform, handle, url: c.url, followers: count(c.followers), posts: count(c.posts),
    evidence: httpsUrl(c.evidenceUrl, 600) ? c.evidenceUrl : null };
}
/** A creator from the scout, or null when malformed. Diets are only what the creator's own words said (the bot checked the quote). */
export function readCreator(c) {
  if (!c || typeof c !== 'object') return null;
  const name = clean(c.name, 120);
  // A name without Latin letters (a Chinese channel, 22 Oct 2026) gets a stable id from its hash; the name itself is kept as written.
  const id = slug(name).length >= 3 ? slug(name) : 'creator-' + createHash('sha256').update(name).digest('hex').slice(0, 10);
  // A malformed channel is left out rather than losing the creator; one without any usable link is skipped.
  const channels = Array.isArray(c.channels) ? c.channels.slice(0, 8).map(readChannel).filter(Boolean) : [];
  const website = c.website != null && httpsUrl(c.website, 300) ? c.website : null;
  if (!name || (!website && !channels.length)) return null;
  return { id, name, kind: c.kind === 'organisation' ? 'organisation' : 'person', country: /^[A-Z]{2}$/.test(c.country ?? '') ? c.country : null,
    region: REGIONS.includes(c.region) ? c.region : 'world', languages: words(c.languages, 6), diets: words(c.diets, 5, DIETS),
    cuisines: words(c.cuisines, 8), website, note: clean(c.note, 500), channels };
}

async function upsertChannel(db, creatorId, ch) {
  await db.query(`INSERT INTO creators.channel (creator_id, platform, handle, url, followers, posts, checked_at, checked_by, evidence_url)
    VALUES ($1,$2,$3,$4,$5,$6,now(),'scout',$7)
    ON CONFLICT (creator_id, platform, handle) DO UPDATE SET followers = coalesce(EXCLUDED.followers, creators.channel.followers),
      posts = coalesce(EXCLUDED.posts, creators.channel.posts), checked_at = now(), evidence_url = coalesce(EXCLUDED.evidence_url, creators.channel.evidence_url)`,
    [creatorId, ch.platform, ch.handle, ch.url, ch.followers, ch.posts, ch.evidence]);
}

/** What the weekly creator scout found (docs/COOKER_CREATOR_LIBRARY_PLAN.md, phase 2). New creators are added as found_by 'scout'; a
 * creator already in the library (same id, website host or channel link) only gets its empty fields filled and its channels added or
 * refreshed: status, pin, invite and name stay as staff set them, and a blocked creator is never touched. `channels` refreshes counts of
 * channels already in the library. Scout-found creators with no passing recipe after 90 days are paused (never pinned ones). */
creatorBots.post('/creators', raw('128kb'), signed, async (req, res, next) => {
  const body = json(req), found = Array.isArray(body?.creators) ? body.creators : [], refresh = Array.isArray(body?.channels) ? body.channels : [];
  if (!body || found.length > MAX_CREATORS || refresh.length > MAX_CHANNELS) return res.status(400).json({ error: `Send at most ${MAX_CREATORS} creators and ${MAX_CHANNELS} channels` });
  // One malformed entry is skipped and counted, never failing the rest of the week's finds.
  const creators = found.map(readCreator).filter(Boolean);
  const channels = refresh.map(c => ({ creatorId: typeof c?.creatorId === 'string' ? c.creatorId : '', channel: readChannel(c) }))
    .filter(c => /^[a-z0-9][a-z0-9-]{2,79}$/.test(c.creatorId) && c.channel);
  const skipped = found.length - creators.length + refresh.length - channels.length;
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    let added = 0, updated = 0, refreshed = 0;
    for (const c of creators) {
      const keys = [c.website, ...c.channels.map(ch => ch.url)].filter(Boolean).map(linkKey).filter(Boolean);
      const hosts = c.website ? [linkKey(c.website).split('/')[0]] : [];
      const match = (await db.query(`SELECT c.id, c.status FROM creators.creator c
        WHERE c.id = $1 OR split_part(lower(regexp_replace(regexp_replace(coalesce(c.website, ''), '^https://(www\\.)?', ''), '/+$', '')), '/', 1) = ANY($2::text[])
          OR EXISTS (SELECT 1 FROM creators.channel ch WHERE ch.creator_id = c.id
            AND lower(regexp_replace(regexp_replace(ch.url, '^https://(www\\.)?', ''), '/+$', '')) = ANY($3::text[]))
        ORDER BY c.id = $1 DESC LIMIT 1 FOR UPDATE`, [c.id, hosts, keys])).rows[0];
      if (match?.status === 'blocked') continue;
      const id = match?.id ?? c.id;
      if (!match) {
        await db.query(`INSERT INTO creators.creator (id, name, kind, country, region, languages, diets, cuisines, website, note, found_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'scout')`, [id, c.name, c.kind, c.country, c.region, c.languages, c.diets, c.cuisines, c.website, c.note]);
        added++;
      } else {
        const filled = await db.query(`UPDATE creators.creator SET country = coalesce(country, $2), website = coalesce(website, $3),
            languages = CASE WHEN cardinality(languages) = 0 THEN $4 ELSE languages END, diets = CASE WHEN cardinality(diets) = 0 THEN $5 ELSE diets END,
            cuisines = CASE WHEN cardinality(cuisines) = 0 THEN $6 ELSE cuisines END, updated_at = now()
          WHERE id = $1 AND (country IS NULL AND $2::text IS NOT NULL OR website IS NULL AND $3::text IS NOT NULL OR cardinality(languages) = 0 AND cardinality($4::text[]) > 0
            OR cardinality(diets) = 0 AND cardinality($5::text[]) > 0 OR cardinality(cuisines) = 0 AND cardinality($6::text[]) > 0)`,
          [id, c.country, c.website, c.languages, c.diets, c.cuisines]);
        updated += filled.rowCount;
      }
      const all = [...c.channels, ...(c.website ? [{ platform: 'website', handle: linkKey(c.website), url: c.website, followers: null, posts: null, evidence: null }] : [])];
      for (const ch of all) await upsertChannel(db, id, ch);
    }
    for (const { creatorId, channel } of channels) {
      const known = await db.query(`SELECT 1 FROM creators.channel ch JOIN creators.creator c ON c.id = ch.creator_id
        WHERE ch.creator_id = $1 AND ch.platform = $2 AND ch.handle = $3 AND c.status <> 'blocked'`, [creatorId, channel.platform, channel.handle]);
      if (known.rowCount) { await upsertChannel(db, creatorId, channel); refreshed++; }
    }
    const paused = await db.query(`UPDATE creators.creator c SET status = 'paused', note = left(trim(note || ' No recipe passed the bar within 90 days of being found.'), 500), updated_at = now()
      FROM creators.score s WHERE s.creator_id = c.id AND c.found_by = 'scout' AND c.status = 'active' AND NOT c.pinned
        AND c.created_at < now() - interval '90 days' AND s.passed = 0`);
    await db.query('COMMIT');
    res.json({ added, updated, refreshed, paused: paused.rowCount, skipped });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    if (missing(error)) return res.status(503).json({ error: 'Creator library not installed' });
    next(error);
  } finally { db.release(); }
});

/** Record pages Cooker looked at. A status never moves backwards: a published page stays published unless withdrawn, and a
 * shortlist or rejection never replaces a draft. A page keeps the first recipe id it was written up under (one id per page). */
creatorBots.post('/sources', raw('64kb'), signed, async (req, res, next) => {
  const body = json(req), list = Array.isArray(body?.sources) ? body.sources : null;
  if (!list || !list.length || list.length > MAX_SOURCES) return res.status(400).json({ error: `Send 1 to ${MAX_SOURCES} sources` });
  const rows = list.map(readSource);
  if (rows.some(r => !r)) return res.status(400).json({ error: 'Invalid source' });
  try {
    for (const r of rows) {
      await pool.query(`INSERT INTO creators.recipe_source AS s (page_key, url, creator_id, platform, name, recipe_id, status, reasons, coverage)
        VALUES ($1, $2, (
            -- a page on a creator's website host, or under one of their channel links (instagram.com/handle/...); the longest link wins
            SELECT ch.creator_id FROM creators.channel ch
              CROSS JOIN LATERAL (SELECT lower(regexp_replace(regexp_replace(ch.url, '^https://(www\\.)?', ''), '/+$', '')) AS k) l
            WHERE $1 = l.k OR $1 LIKE l.k || '/%' OR (ch.platform = 'website' AND split_part($1, '/', 1) = split_part(l.k, '/', 1))
            ORDER BY length(l.k) DESC LIMIT 1),
          $3, $4, $5, $6, $7, $8)
        ON CONFLICT (page_key) DO UPDATE SET
          url = EXCLUDED.url, last_seen = now(), coverage = coalesce(EXCLUDED.coverage, s.coverage),
          creator_id = coalesce(s.creator_id, EXCLUDED.creator_id),
          name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE s.name END,
          recipe_id = coalesce(s.recipe_id, EXCLUDED.recipe_id),
          status = CASE WHEN s.status = 'published' AND EXCLUDED.status <> 'withdrawn' THEN s.status
                        WHEN EXCLUDED.status IN ('shortlisted','rejected') AND s.status IN ('drafted','held','published','withdrawn') THEN s.status
                        ELSE EXCLUDED.status END,
          reasons = CASE WHEN cardinality(EXCLUDED.reasons) > 0 THEN EXCLUDED.reasons ELSE s.reasons END`,
        [r.key, r.url, r.platform, r.name, r.recipeId, r.status, r.reasons, r.coverage]);
    }
    res.json({ recorded: rows.length, keys: rows.map(r => r.key) });
  } catch (error) {
    if (missing(error)) return res.status(503).json({ error: 'Creator library not installed' });
    next(error);
  }
});
