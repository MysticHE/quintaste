import express from 'express';
import { pool } from '../config.mjs';
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
        coalesce(json_agg(json_build_object('platform', ch.platform, 'handle', ch.handle, 'url', ch.url, 'followers', ch.followers))
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
