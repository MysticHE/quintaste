import { createHmac } from 'node:crypto';
import { pool } from '../config.mjs';
import { communityRouter, errors, member, throttle } from '../community/http.mjs';
import { normaliseTerm } from './terms.mjs';
import { serverMatches, suggest } from './suggest.mjs';

/**
 * Cook search: suggestions while typing (guests too) and the settled-search log that finds wanted recipes (members only,
 * so every searcher is a real account). Not behind the recipes control: suggestions include bundled and QuinTaste recipes.
 */
export const cookSearch = communityRouter({ guests: true, bodyLimit: '2kb' });
// Distinct searchers are counted by an HMAC of the account id; the key exists only in the server's memory.
const memberKey = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '').update('cook-search-demand-v1').digest();
const memberHash = id => createHmac('sha256', memberKey).update(String(id)).digest('hex');

cookSearch.get('/suggest', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  res.json({ items: await suggest(q, res.locals.user?.id ?? null) });
});

/** One settled search: the term and how many recipes the device showed for it (the server adds its own count). */
cookSearch.post('/searches', member, async (req, res) => {
  const term = normaliseTerm(req.body?.term), shown = Number(req.body?.results);
  if (!term || !Number.isInteger(shown) || shown < 0 || shown > 10000) return res.status(204).end();
  const me = res.locals.user.id;
  await throttle('cook-search:' + me, 120, 3600);
  // A device can only report more results than the server sees (its bundled recipes), never hide recipes that exist.
  const results = Math.max(shown, await serverMatches(term));
  await pool.query(`INSERT INTO recipes.search_term (term, day, searches, results) VALUES ($1, (now() AT TIME ZONE 'Asia/Singapore')::date, 1, $2)
    ON CONFLICT (term, day) DO UPDATE SET searches = recipes.search_term.searches + 1, results = EXCLUDED.results`, [term, results]);
  await pool.query(`INSERT INTO recipes.search_member (term, member_hash, last_day) VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Singapore')::date)
    ON CONFLICT (term, member_hash) DO UPDATE SET last_day = EXCLUDED.last_day`, [term, memberHash(me)]);
  res.status(204).end();
});

cookSearch.use(errors);
