import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, pick, requireId, text, throttle, transaction } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { diets, pays, profileIssue, readFuture, sgText } from './rules.mjs';

export const gatherings = express.Router();
const nameOf = `coalesce(nullif(p.first_name,''), u.name, 'Member')`;
const columns = `g.id, g.title, g.area, g.venue, ${sgText('g.starts')} AS starts, g.seats, g.diet, g.food, g.pay, g.alcohol_free AS "alcoholFree", g.state,
  g.organiser_id AS "organiserId", (SELECT ${nameOf} FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=g.organiser_id) AS "organiserName",
  (SELECT count(*)::int FROM social.attendee a WHERE a.gathering_id=g.id) + 1 AS going, (g.starts IS NOT NULL AND g.starts <= now()) AS past`;
function readGathering(body) {
  body ??= {};
  const seats = Number(body.seats);
  if (!Number.isInteger(seats) || seats < 2 || seats > 30) throw new CommunityError(400, 'Choose 2–30 people, including you.');
  return { title: text(body.title, 80, { min: 1, field: 'Name' }), area: text(body.area, 60, { field: 'Neighbourhood' }), venue: text(body.venue, 160, { field: 'Meeting place' }),
    startsText: typeof body.starts === 'string' ? body.starts : '', seats, diet: pick(body.diet, diets, 'Vegan'), food: text(body.food, 1000, { field: 'Food' }),
    pay: pick(body.pay, pays, 'own'), alcoholFree: body.alcoholFree === true };
}
async function requireProfile(db, me) {
  const p = (await db.query('SELECT first_name AS "firstName", area, times FROM social.profile WHERE user_id=$1', [me])).rows[0];
  if (profileIssue(p)) throw new CommunityError(409, 'Finish your profile first.');
}
gatherings.get('/gatherings', async (req, res) => {
  const me = res.locals.user.id, params = [me], q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
  const search = q ? `AND (g.title || ' ' || g.area || ' ' || g.venue) ILIKE $2` : '';
  if (q) params.push('%' + q.replace(/[\\%_]/g, '\\$&') + '%');
  const rows = (await pool.query(`SELECT ${columns}, EXISTS (SELECT 1 FROM social.attendee a WHERE a.gathering_id=g.id AND a.user_id=$1) AS joined, g.organiser_id=$1 AS mine
    FROM social.gathering g WHERE g.state='posted' AND g.starts > now() AND ${notRestricted('g.organiser_id')} AND ${notBlocked('g.organiser_id', '$1')} ${search}
    ORDER BY g.starts LIMIT 60`, params)).rows;
  res.json({ items: rows });
});
gatherings.get('/gatherings/mine', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT ${columns}, EXISTS (SELECT 1 FROM social.attendee a WHERE a.gathering_id=g.id AND a.user_id=$1) AS joined, g.organiser_id=$1 AS mine
    FROM social.gathering g WHERE g.organiser_id=$1 OR EXISTS (SELECT 1 FROM social.attendee a WHERE a.gathering_id=g.id AND a.user_id=$1)
    ORDER BY g.starts NULLS FIRST LIMIT 100`, [me])).rows;
  res.json({ items: rows });
});
gatherings.get('/gatherings/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  const row = (await pool.query(`SELECT ${columns}, EXISTS (SELECT 1 FROM social.attendee a WHERE a.gathering_id=g.id AND a.user_id=$1) AS joined, g.organiser_id=$1 AS mine
    FROM social.gathering g WHERE g.id=$2 AND ${notBlocked('g.organiser_id', '$1')} AND (g.organiser_id=$1 OR g.state<>'draft')`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This gathering is unavailable.');
  const people = row.mine || row.joined ? (await pool.query(`SELECT u.id, ${nameOf} AS name FROM social.attendee a JOIN public."user" u ON u.id=a.user_id
    LEFT JOIN social.profile p ON p.user_id=u.id WHERE a.gathering_id=$1 ORDER BY a.joined_at`, [id])).rows : [];
  res.json({ ...row, attendees: people });
});
/** Create or edit; posting needs a neighbourhood, a public place and a future time. */
async function save(req, res, id) {
  const me = res.locals.user.id, g = readGathering(req.body?.gathering), post = req.body?.post === true;
  const starts = post || g.startsText ? readFuture(g.startsText) : null;
  if (post && (!g.area || !g.venue)) throw new CommunityError(400, 'Add a neighbourhood and a public meeting place.');
  await throttle('social-gathering:' + me, 60, 3600);
  const saved = await transaction(async db => {
    await requireProfile(db, me);
    const values = [g.title, g.area, g.venue, starts, g.seats, g.diet, g.food, g.pay, g.alcoholFree];
    if (id) {
      const row = (await db.query('SELECT organiser_id, state FROM social.gathering WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!row || row.organiser_id !== me) throw new CommunityError(404, 'This gathering is unavailable.');
      if (row.state === 'cancelled') throw new CommunityError(409, 'This gathering was cancelled.');
      // A posted gathering stays complete: an edit without `post` must still keep its place and a future time.
      if (row.state === 'posted' && (!starts || !g.area || !g.venue)) throw new CommunityError(400, 'A posted gathering needs a neighbourhood, a public meeting place and a future time.');
      const going = Number((await db.query('SELECT count(*) FROM social.attendee WHERE gathering_id=$1', [id])).rows[0].count) + 1;
      if (g.seats < going) throw new CommunityError(409, `${going} people are already going.`);
      await db.query(`UPDATE social.gathering SET title=$1,area=$2,venue=$3,starts=$4,seats=$5,diet=$6,food=$7,pay=$8,alcohol_free=$9,
        state=CASE WHEN $10 THEN 'posted' ELSE state END, updated_at=now() WHERE id=$11`, [...values, post, id]);
      return id;
    }
    if (Number((await db.query('SELECT count(*) FROM social.gathering WHERE organiser_id=$1', [me])).rows[0].count) >= 30) throw new CommunityError(409, 'You have 30 gatherings. Delete an old one first.');
    return (await db.query(`INSERT INTO social.gathering(organiser_id,title,area,venue,starts,seats,diet,food,pay,alcohol_free,state)
      VALUES($10,$1,$2,$3,$4,$5,$6,$7,$8,$9,$11) RETURNING id`, [...values, me, post ? 'posted' : 'draft'])).rows[0].id;
  }, 'social-gathering:' + me);
  res.status(id ? 200 : 201).json({ id: saved });
}
gatherings.post('/gatherings', (req, res) => save(req, res, null));
gatherings.put('/gatherings/:id', (req, res) => save(req, res, requireId(req.params.id)));
gatherings.post('/gatherings/:id/cancel', async (req, res) => {
  const result = await pool.query(`UPDATE social.gathering SET state='cancelled', updated_at=now() WHERE id=$1 AND organiser_id=$2 AND state='posted'`, [requireId(req.params.id), res.locals.user.id]);
  if (!result.rowCount) throw new CommunityError(409, 'Only a posted gathering can be cancelled.');
  res.json({ state: 'cancelled' });
});
gatherings.delete('/gatherings/:id', async (req, res) => {
  const result = await pool.query(`DELETE FROM social.gathering WHERE id=$1 AND organiser_id=$2 AND (state<>'posted' OR starts <= now())`, [requireId(req.params.id), res.locals.user.id]);
  if (!result.rowCount) throw new CommunityError(409, 'Cancel the gathering before deleting it.');
  res.json({ deleted: true });
});
gatherings.post('/gatherings/:id/join', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  await throttle('social-join:' + me, 30, 3600);
  await transaction(async db => {
    await requireProfile(db, me);
    const g = (await db.query(`SELECT organiser_id, seats FROM social.gathering g WHERE id=$1 AND state='posted' AND starts > now()
      AND ${notRestricted('g.organiser_id')} AND ${notBlocked('g.organiser_id', '$2')} FOR UPDATE`, [id, me])).rows[0];
    if (!g || g.organiser_id === me) throw new CommunityError(404, 'This gathering is unavailable.');
    // Blocking is mutual across Social: never seat someone with a person they blocked or were blocked by.
    if ((await db.query(`SELECT 1 FROM social.attendee a WHERE a.gathering_id=$1 AND a.user_id<>$2 AND NOT ${notBlocked('a.user_id', '$2')} LIMIT 1`, [id, me])).rowCount) {
      throw new CommunityError(404, 'This gathering is unavailable.');
    }
    const going = Number((await db.query('SELECT count(*) FROM social.attendee WHERE gathering_id=$1', [id])).rows[0].count) + 1;
    if (going >= g.seats) throw new CommunityError(409, 'This gathering is full.');
    await db.query('INSERT INTO social.attendee(gathering_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, me]);
  }, 'social-gathering-seat:' + id);
  res.json({ joined: true });
});
gatherings.post('/gatherings/:id/leave', async (req, res) => {
  await pool.query('DELETE FROM social.attendee WHERE gathering_id=$1 AND user_id=$2', [requireId(req.params.id), res.locals.user.id]);
  res.json({ joined: false });
});

// Class and home-dining applications: drafts stay private; submitting files a case for staff review.
const declarations = ['Only residents prepare the food', 'No catering, buffets or packed meals for sale', 'No raw ready-to-eat seafood',
  'Ingredients come from licensed sources', 'No signage at the premises', 'No alcohol is sold'];
function readApplication(body) {
  body ??= {};
  return { kind: body.kind === 'Home dining' ? 'Home dining' : 'Cooking class', name: text(body.name, 80, { field: 'Name' }), email: text(body.email, 160, { field: 'Email' }),
    area: text(body.area, 60, { field: 'Neighbourhood' }), experience: text(body.experience, 1000, { field: 'Experience' }), menu: text(body.menu, 2000, { field: 'Menu' }),
    ingredients: text(body.ingredients, 3000, { field: 'Ingredients' }), details: text(body.details, 2000, { field: 'Details' }),
    premises: pick(body.premises, ['HDB flat', 'Private home', 'Commercial kitchen'], ''), capacity: String(Number(body.capacity) || '').slice(0, 2),
    halal: pick(body.halal, ['Not halal-certified', 'Halal-certified'], ''), declarations: declarations.filter(item => Array.isArray(body.declarations) && body.declarations.includes(item)),
    consent: body.consent === true };
}
function applicationIssue(a) {
  if (!a.name) return 'Add the host or business name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return 'Enter a valid contact email.';
  if (![a.area, a.experience, a.menu, a.ingredients, a.details].every(Boolean)) return 'Complete all application details.';
  if (!a.premises || !(Number(a.capacity) >= 1)) return 'Choose the premises type and how many guests or students attend.';
  if (!a.halal) return 'State the halal status.';
  if (declarations.some(d => !a.declarations.includes(d))) return 'Confirm each home-food declaration.';
  return a.consent ? null : 'Confirm the application information is accurate.';
}
gatherings.get('/applications', async (_req, res) => {
  const rows = (await pool.query('SELECT id, kind, payload, state, created_at AS "createdAt", updated_at AS "updatedAt" FROM social.application WHERE user_id=$1 ORDER BY updated_at DESC', [res.locals.user.id])).rows;
  res.json({ items: rows.map(row => ({ ...row.payload, id: row.id, kind: row.kind, state: row.state, updatedAt: row.updatedAt })) });
});
async function saveApplication(req, res, id) {
  const me = res.locals.user.id, a = readApplication(req.body?.application), submit = req.body?.submit === true;
  if (submit && applicationIssue(a)) throw new CommunityError(400, applicationIssue(a));
  await throttle('social-application:' + me, 30, 3600);
  const saved = await transaction(async db => {
    if (id) {
      const row = (await db.query('SELECT state FROM social.application WHERE id=$1 AND user_id=$2 FOR UPDATE', [id, me])).rows[0];
      if (!row) throw new CommunityError(404, 'This application is unavailable.');
      if (row.state === 'submitted') throw new CommunityError(409, 'This application was already sent for review.');
      await db.query('UPDATE social.application SET kind=$2, payload=$3, updated_at=now() WHERE id=$1', [id, a.kind, a]);
    } else {
      if (Number((await db.query('SELECT count(*) FROM social.application WHERE user_id=$1', [me])).rows[0].count) >= 10) throw new CommunityError(409, 'You have 10 applications. Delete one first.');
      id = (await db.query('INSERT INTO social.application(user_id,kind,payload) VALUES($1,$2,$3) RETURNING id', [me, a.kind, a])).rows[0].id;
    }
    if (submit) {
      // Each submission opens a staff case; cap them so delete-and-resubmit can't flood the queue.
      const recent = await db.query(`SELECT count(*)::int AS count FROM ops.case_record WHERE kind='report' AND subject_id LIKE 'social:application:%'
        AND subject_id LIKE $1 AND created_at > now() - interval '7 days'`, ['%|by:' + me]);
      if (recent.rows[0].count >= 3) throw new CommunityError(429, 'You can send three applications a week. Try again later.');
      const description = [`Applicant: ${a.name} <${a.email}>`, `Neighbourhood: ${a.area}`, `Premises: ${a.premises} · ${a.capacity} per session · ${a.halal}`,
        `Experience:\n${a.experience}`, `Menu / lesson:\n${a.menu}`, `Ingredients & allergens:\n${a.ingredients}`, `Arrangements:\n${a.details}`].join('\n\n');
      const caseRow = (await db.query(`INSERT INTO ops.case_record(kind,title,description,subject_id) VALUES('report',$1,$2,$3) RETURNING id`,
        ['Host application · ' + a.kind, description, 'social:application:' + id + '|by:' + me])).rows[0];
      await db.query("UPDATE social.application SET state='submitted', case_id=$2, updated_at=now() WHERE id=$1", [id, caseRow.id]);
      logger.info({ event: 'social_application_submitted' });
    }
    return id;
  }, 'social-application:' + me);
  res.status(201).json({ id: saved, state: submit ? 'submitted' : 'draft' });
}
gatherings.post('/applications', (req, res) => saveApplication(req, res, null));
gatherings.put('/applications/:id', (req, res) => saveApplication(req, res, requireId(req.params.id)));
gatherings.delete('/applications/:id', async (req, res) => {
  await pool.query('DELETE FROM social.application WHERE id=$1 AND user_id=$2', [requireId(req.params.id), res.locals.user.id]);
  res.json({ deleted: true });
});
