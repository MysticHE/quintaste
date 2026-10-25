import express from 'express';
import { logger, pool } from '../config.mjs';
import { CommunityError, list, requireId, text, throttle, transaction } from '../community/http.mjs';
import { publishedPlaceIds } from '../catalogue-places.mjs';
import { placeView } from './places.mjs';
import * as options from './options.mjs';
import { fivePungent, readDiets, readPrompts, legacyDiet, storedPractices } from './rules.mjs';
import { ingredients } from '../market/rules.mjs';
import { ageFrom, seeableSql, standing } from './access.mjs';
import { profilePhoto } from './media.mjs';
import { changeHandle, ensureHandle } from './handles.mjs';

export const profile = express.Router();
/** Optional fields a member may hide from others; name, age, gender, area, photos and food always show on a public profile. */
export const hideable = ['religion', 'ethnicity', 'why', 'hobbies', 'languages', 'education', 'work', 'grewUp', 'height', 'drinking', 'smoking', 'pets', 'spots'];
const optional = (value, choices) => choices.includes(value) ? value : '';
const whole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : null;
const spotIds = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{2,119}$/.test(id)))].slice(0, 3) : [];
/** "YYYY-MM-DD", a real date, at least 18 years ago (the app's own minimum) and not before 1920. */
function readBirthDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CommunityError(400, 'Choose your birth date.');
  const at = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value || value < '1920-01-01') throw new CommunityError(400, 'Choose a valid birth date.');
  if (ageFrom(value) < 18) throw new CommunityError(400, 'QuinTaste is for members aged 18 and over.');
  return value;
}
export function readMeetProfile(body) {
  body ??= {};
  return { firstName: text(body.firstName, 40, { field: 'First name' }), gender: optional(body.gender, options.genders), birthDate: readBirthDate(body.birthDate),
    area: text(body.area, 60, { field: 'Area' }), diets: readDiets(body.diets), excluded: list(body.excluded, ingredients), spots: spotIds(body.spots),
    about: text(body.about, 180, { field: 'About me' }), opening: text(body.opening, 120, { field: 'Ask me about' }), visible: body.visible !== false,
    religion: optional(body.religion, options.religions), ethnicity: optional(body.ethnicity, options.ethnicities), why: list(body.why, options.whyPlantBased),
    hobbies: list(body.hobbies, options.hobbies, 12), languages: list(body.languages, options.languages), education: optional(body.education, options.educations),
    work: text(body.work, 40, { field: 'Work' }), grewUp: text(body.grewUp, 40, { field: 'Grew up in' }), height: whole(body.height, 120, 230),
    drinking: optional(body.drinking, options.habits), smoking: optional(body.smoking, options.habits), pets: list(body.pets, options.pets),
    prompts: readPrompts(body.prompts), hidden: list(body.hidden, hideable) };
}
export const meetColumns = `p.first_name AS "firstName", p.gender, to_char(p.birth_date, 'YYYY-MM-DD') AS "birthDate", p.area, p.diets, p.excluded, p.spots,
  p.about, p.opening, p.visible, p.religion, p.ethnicity, p.why, p.hobbies, p.languages, p.education, p.work, p.grew_up AS "grewUp", p.height, p.drinking,
  p.smoking, p.pets, p.prompts, p.hidden`;
export const emptyProfile = { firstName: '', gender: '', birthDate: null, area: '', diets: ['Plant-Based'], excluded: [], spots: [], about: '', opening: '', visible: true,
  religion: '', ethnicity: '', why: [], hobbies: [], languages: [], education: '', work: '', grewUp: '', height: null, drinking: '', smoking: '', pets: [],
  prompts: [], hidden: ['ethnicity'] };
export const photoUrl = (photo, size) => `/api/social/photos/${photo.id}?v=${photo.digest.slice(0, 12)}${size === 'thumb' ? '&size=thumb' : ''}`;
const photoView = photo => ({ id: photo.id, position: photo.position, url: photoUrl(photo), thumb: photoUrl(photo, 'thumb') });
const myPhotos = async (me, db = pool) => (await db.query('SELECT id, position, digest FROM social.photo WHERE user_id=$1 ORDER BY position', [me])).rows.map(photoView);

profile.get('/me', async (_req, res) => {
  const me = res.locals.user;
  const found = (await pool.query(`SELECT p.user_id IS NOT NULL AS "hasProfile", ${meetColumns}, (SELECT h.handle FROM social.handle h WHERE h.user_id=me.id) AS handle,
      (SELECT u.bio FROM public."user" u WHERE u.id=me.id) AS "accountBio"
    FROM (SELECT $1::text AS id) me LEFT JOIN social.profile p ON p.user_id=me.id`, [me.id])).rows[0];
  const [state, photos] = await Promise.all([standing(me.id), myPhotos(me.id)]);
  const { hasProfile, handle: stored, accountBio, ...row } = found;
  // Every member has a handle so friends can find them; handles.sql gave existing accounts one, and this makes the rest. A
  // failure leaves it empty rather than breaking Social, and Basics lets the member choose one.
  const handle = stored ?? await ensureHandle(pool, me.id, row.firstName || me.name).catch(error => {
    logger.warn({ event: 'social_handle_missing', error: error?.message }); return null;
  });
  // One bio (owner, 25 Oct 2026): a bio written before About me took over starts About me until the next profile save, which clears it.
  const bio = typeof accountBio === 'string' ? accountBio.slice(0, 180) : '', profile = hasProfile ? row : emptyProfile;
  res.json({ id: me.id, accountName: me.name, handle, hasProfile, profile: profile.about || !bio ? profile : { ...profile, about: bio }, photos, standing: state });
});
/** Saves the profile; `handle`, when sent (Basics), changes the member's handle in the same transaction. */
profile.put('/me', async (req, res) => {
  const me = res.locals.user.id, p = readMeetProfile(req.body?.profile), wanted = req.body?.handle;
  await throttle('social-profile:' + me, 120, 3600);
  p.spots = (await publishedPlaceIds(p.spots)).filter(id => id && placeView(id));
  await transaction(async db => {
    const stored = (await db.query(`SELECT p.first_name AS name, p.gender, to_char(p.birth_date, 'YYYY-MM-DD') AS birth, p.practices, v.status FROM social.profile p
      LEFT JOIN social.verification v ON v.user_id=p.user_id WHERE p.user_id=$1 FOR UPDATE OF p`, [me])).rows[0];
    // Gender decides who sees whom and age decides who may meet, so both are fixed once a selfie has been sent for checking.
    if (stored?.status && stored.status !== 'none' && (stored.gender !== p.gender || stored.birth !== p.birthDate)) {
      throw new CommunityError(409, 'Gender and birth date cannot change after your photo check. Contact us if they are wrong.', 'SOCIAL_LOCKED');
    }
    // Practices declared before 24 Oct 2026 (No egg, Lunar 1st & 15th) are kept, though this app no longer edits them; the old No five
    // pungent practice follows the Vegetarian label for older app images.
    const kept = (stored?.practices ?? []).filter(practice => practice !== fivePungent);
    await db.query(`INSERT INTO social.profile(user_id, first_name, gender, birth_date, area, diets, diet, practices, excluded, spots, about, opening, visible, religion, ethnicity,
        why, hobbies, languages, education, work, grew_up, height, drinking, smoking, pets, prompts, hidden)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      ON CONFLICT(user_id) DO UPDATE SET first_name=$2, gender=$3, birth_date=$4, area=$5, diets=$6, diet=$7, practices=$8, excluded=$9, spots=$10, about=$11,
        opening=$12, visible=$13, religion=$14, ethnicity=$15, why=$16, hobbies=$17, languages=$18, education=$19, work=$20, grew_up=$21, height=$22, drinking=$23,
        smoking=$24, pets=$25, prompts=$26, hidden=$27, updated_at=now()`,
    [me, p.firstName, p.gender, p.birthDate, p.area, p.diets, legacyDiet(p.diets), storedPractices(kept, p.diets), p.excluded, p.spots, p.about, p.opening, p.visible,
      p.religion, p.ethnicity, p.why, p.hobbies, p.languages, p.education, p.work, p.grewUp, p.height, p.drinking, p.smoking, p.pets, JSON.stringify(p.prompts), p.hidden]);
    if (wanted !== undefined) await changeHandle(db, me, wanted);
    else await ensureHandle(db, me, p.firstName || res.locals.user.name);
    // One name (owner, 25 Oct 2026): a name the member changes in Basics also becomes the account name, so Market and class chats
    // show the same name. Other saves (visibility, Food Choices) resend the stored name and leave the account name alone.
    if (p.firstName && p.firstName !== (stored?.name ?? '')) await db.query('UPDATE public."user" SET name=$2, "updatedAt"=now() WHERE id=$1 AND name IS DISTINCT FROM $2', [me, p.firstName]);
    // The old account bio only seeded About me; once the profile is saved, About me is the one bio.
    await db.query(`UPDATE public."user" SET bio='', "updatedAt"=now() WHERE id=$1 AND COALESCE(bio, '')<>''`, [me]);
  });
  res.json({ profile: p, standing: await standing(me) });
});

/** One photo per request (the edge caps request bodies): added after the last one, up to six. */
profile.post('/me/photos', async (req, res) => {
  const me = res.locals.user.id;
  await throttle('social-photo:' + me, 30, 3600, 'You have added a lot of photos. Try again later.');
  const photo = await profilePhoto(req.body?.image);
  try {
    await transaction(async db => {
      const count = Number((await db.query('SELECT count(*) FROM social.photo WHERE user_id=$1', [me])).rows[0].count);
      if (count >= 6) throw new CommunityError(409, 'You can show up to 6 photos. Remove one first.');
      await db.query('INSERT INTO social.photo(user_id, position, image, thumb, digest) VALUES($1,$2,$3,$4,$5)', [me, count, photo.image, photo.thumb, photo.digest]);
    }, 'social-photos:' + me);
  } finally { photo.image.fill(0); photo.thumb.fill(0); }
  res.status(201).json({ photos: await myPhotos(me), standing: await standing(me) });
});
/** The member's photo ids in the new order; the first is the main photo. */
profile.put('/me/photos/order', async (req, res) => {
  const me = res.locals.user.id, ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 6 || new Set(ids).size !== ids.length) throw new CommunityError(400, 'Choose the order of your photos.');
  ids.forEach(id => requireId(id, 'That photo is unavailable.'));
  await transaction(async db => {
    const stored = (await db.query('SELECT id FROM social.photo WHERE user_id=$1', [me])).rows.map(row => row.id);
    if (stored.length !== ids.length || !ids.every(id => stored.includes(id))) throw new CommunityError(409, 'Your photos changed. Reload and try again.');
    await db.query(`UPDATE social.photo p SET position=o.position - 1 FROM unnest($2::uuid[]) WITH ORDINALITY AS o(id, position) WHERE p.id=o.id AND p.user_id=$1`, [me, ids]);
  }, 'social-photos:' + me);
  res.json({ photos: await myPhotos(me), standing: await standing(me) });
});
profile.delete('/me/photos/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'That photo is unavailable.');
  await transaction(async db => {
    const removed = await db.query('DELETE FROM social.photo WHERE id=$1 AND user_id=$2', [id, me]);
    if (!removed.rowCount) throw new CommunityError(404, 'That photo is unavailable.');
    await db.query(`UPDATE social.photo p SET position=o.position - 1 FROM (SELECT id, row_number() OVER (ORDER BY position) AS position FROM social.photo WHERE user_id=$1) o
      WHERE p.id=o.id AND p.position<>o.position - 1`, [me]);
  }, 'social-photos:' + me);
  res.json({ photos: await myPhotos(me), standing: await standing(me) });
});
/** Photos follow profile access (`seeableSql`). The digest in the link changes with the photo, so a short private cache is safe. */
profile.get('/photos/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'That photo is unavailable.'), thumb = req.query.size === 'thumb';
  const row = (await pool.query(`SELECT ${thumb ? 'ph.thumb' : 'ph.image'} AS bytes FROM social.photo ph WHERE ph.id=$2 AND ${seeableSql('ph.user_id', '$1')}`, [me, id])).rows[0];
  if (!row) return res.status(404).end();
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=600', 'X-Content-Type-Options': 'nosniff' }).send(row.bytes);
});
