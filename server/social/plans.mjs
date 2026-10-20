import express from 'express';
import { CommunityError, pick, requireId, text, transaction } from '../community/http.mjs';
import { noShowSql, pays, readFuture, sgText } from './rules.mjs';
import { readAreaCode, requirePlace, venueText } from './places.mjs';
import { event, liveSql, load, offerDays, offerOf, touch, unbalanced, waivedBy } from './group-core.mjs';

export const plans = express.Router();
const sgLabel = date => date.toLocaleString('en-SG', { timeZone: 'Asia/Singapore', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
/** Proposing or changing the plan clears everyone's confirmation and re-offers the new plan to anyone still invited. */
plans.post('/groups/:id/plan', async (req, res) => {
  const me = res.locals.user.id, starts = readFuture(req.body?.starts);
  const place = req.body?.placeId ? await requirePlace(req.body.placeId) : null;
  const venue = place ? venueText(place) : text(req.body?.venue, 160, { min: 3, field: 'Place' });
  const food = text(req.body?.food, 1000, { field: 'Food' }), pay = pick(req.body?.pay, pays, 'own');
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (group.listed && group.created_by !== me) throw new CommunityError(403, 'Only the host changes an open table.');
    if (mine.status !== 'accepted' || (!group.listed && list.filter(m => m.status === 'accepted').length < 2)) throw new CommunityError(403, 'Plans open once someone has joined.');
    // The catalogue place stays while the place itself is unchanged; a newly chosen place brings its own planning area.
    const same = !place && venue === group.venue, placeId = place?.id ?? (same ? group.place_id : null);
    const areaCode = place ? readAreaCode(req.body?.areaCode) : same ? group.area_code : null;
    const updated = (await db.query(`UPDATE social."group" SET venue=$2, starts=$3, food=$4, pay=$5, place_id=$6, area_code=$7, updated_at=now() WHERE id=$1 RETURNING *, ${sgText('starts')} AS starts_text`,
      [group.id, venue, starts, food, pay, placeId, areaCode])).rows[0];
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await db.query(`UPDATE social.member m SET offer=$2, expires_at=now() + make_interval(days => $3) WHERE m.group_id=$1 AND m.status='invited' AND ${liveSql('m')}`, [group.id, offerOf(updated), offerDays]);
    await event(db, group.id, group.venue ? 'Plan changed · ' + venue : 'Plan: ' + venue);
  });
  res.json({ planned: true });
});
/**
 * Invitations confirm when every seat is taken. Tables confirm with at least three people (two for a private Repeat
 * table once nobody is still deciding), and an open table only while it is balanced (owner rule).
 */
plans.post('/groups/:id/confirm', async (req, res) => {
  const me = res.locals.user.id;
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'accepted') throw new CommunityError(403, 'Join the group first.');
    if (!group.venue || !group.starts || new Date(group.starts).getTime() <= Date.now()) throw new CommunityError(409, 'Agree a future plan first.');
    const seated = list.filter(m => m.status === 'accepted'), joined = seated.length;
    if (group.origin === 'table') {
      const deciding = list.some(m => m.status === 'invited' && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now()));
      if (group.listed ? joined < 3 : joined < 2 || deciding) throw new CommunityError(409, group.listed ? 'Confirming opens when three people have joined.' : 'Confirming opens when everyone invited has answered.');
      if (group.listed && !waivedBy(group, seated) && unbalanced(seated.map(m => m.gender))) throw new CommunityError(409, 'Confirming opens when the table is balanced.');
    } else if (joined !== group.size) throw new CommunityError(409, `Confirming opens when all ${group.size} people have joined.`);
    if (!mine.confirmed) {
      await db.query('UPDATE social.member SET confirmed=true, updated_at=now() WHERE group_id=$1 AND user_id=$2', [group.id, me]);
      await event(db, group.id, `${mine.name} confirmed`);
      await touch(db, group.id);
    }
  });
  res.json({ confirmed: true });
});
/** An invitee proposes another time instead of saying no; the invitation stays open for three more days. */
plans.post('/groups/:id/suggest', async (req, res) => {
  const me = res.locals.user.id, starts = readFuture(req.body?.starts);
  await transaction(async db => {
    const { group, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'invited') throw new CommunityError(409, 'This invitation is no longer pending.');
    await db.query(`UPDATE social.member SET offer=coalesce(offer, '{}'::jsonb) || jsonb_build_object('suggested', to_char($3::timestamptz AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI')),
      expires_at=now() + make_interval(days => $4), updated_at=now() WHERE group_id=$1 AND user_id=$2`, [group.id, me, starts, offerDays]);
    await event(db, group.id, `${mine.name} suggested ${sgLabel(starts)}`);
    await touch(db, group.id);
  });
  res.json({ suggested: true });
});
/** Two no-shows in 90 days pause Open to plans for 30 days. */
async function pauseIfMissed(db, userId) {
  const missed = Number((await db.query(`SELECT ${noShowSql('$1', 90)} AS n`, [userId])).rows[0].n);
  if (missed < 2) return false;
  await db.query("UPDATE social.profile SET visible=false, paused_until=greatest(coalesce(paused_until, now()), now() + interval '30 days'), updated_at=now() WHERE user_id=$1", [userId]);
  return true;
}
/**
 * After the meal (up to 14 days): did you go, who you would eat with again, who did not come, and an optional line about
 * each tablemate. A no-show counts from the person's own "no", or from tablemates' reports (one at a table of two, two
 * otherwise). Nothing here is public until the subject approves a line; reports are never shown to the person reported.
 */
plans.post('/groups/:id/attend', async (req, res) => {
  const me = res.locals.user.id, attended = pick(req.body?.attended, ['yes', 'no', 'changed'], null);
  if (!attended) throw new CommunityError(400, 'Say whether you went.');
  const says = req.body?.says && typeof req.body.says === 'object' ? req.body.says : {};
  const paused = await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    const at = group.starts ? new Date(group.starts).getTime() : NaN;
    if (!mine.acceptedAt) throw new CommunityError(403, 'Only people at the table can answer.');
    if (!(at < Date.now() && at > Date.now() - 14 * 86400000)) throw new CommunityError(409, 'This opens after the meal, for two weeks.');
    const mates = new Set(list.filter(m => m.id !== me && m.acceptedAt).map(m => m.id));
    const missing = attended === 'yes' && Array.isArray(req.body?.missing) ? [...new Set(req.body.missing.filter(id => mates.has(id)))] : [];
    const again = attended === 'yes' && Array.isArray(req.body?.eatAgain) ? [...new Set(req.body.eatAgain.filter(id => mates.has(id) && !missing.includes(id)))].slice(0, 6) : [];
    await db.query('UPDATE social.member SET attended=$3, attended_at=now(), eat_again=$4 WHERE group_id=$1 AND user_id=$2', [group.id, me, attended, again]);
    if (attended === 'yes') for (const [about, line] of Object.entries(says)) {
      const body = typeof line === 'string' ? line.trim().slice(0, 80) : '';
      if (!body || !mates.has(about) || missing.includes(about)) continue;
      await db.query(`INSERT INTO social.kaki_say(about_id,by_id,group_id,body) VALUES($1,$2,$3,$4)
        ON CONFLICT(about_id,by_id,group_id) DO UPDATE SET body=$4, shown=false, created_at=now()`, [about, me, group.id, body]);
    }
    // Answers can be changed within the window, so this member's earlier reports at this table are replaced.
    await db.query('DELETE FROM social.no_show WHERE group_id=$1 AND by_id=$2', [group.id, me]);
    for (const about of missing) {
      await db.query('INSERT INTO social.no_show(group_id,about_id,by_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [group.id, about, me]);
      await pauseIfMissed(db, about);
    }
    return attended === 'no' ? pauseIfMissed(db, me) : false;
  });
  res.json({ recorded: true, paused });
});
