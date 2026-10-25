import { communityRouter, errors } from '../community/http.mjs';
import { profile } from './profile.mjs';
import { verify } from './verify.mjs';
import { people } from './people.mjs';
import { friends } from './friends.mjs';
import { dinners } from './dinners.mjs';
import { places } from './places.mjs';
import { handles } from './handles.mjs';
import { requireBrowse, standing } from './access.mjs';

/** Profile photos (1 MB) and the live selfie (2 MB) arrive as data URIs, one per request; everything else stays small. */
const photoRoute = req => req.method === 'POST' && (req.path === '/me/photos' || req.path === '/me/verify');
/** Every Social route needs a signed-in, age-checked, unrestricted member. */
export const social = communityRouter({ bodyLimit: '64kb', photoLimit: '3mb', photos: photoRoute });
/**
 * Profile, photos, friends, chat and handles are for every signed-in, age-checked member (owner, 25 Oct 2026). Only Dining
 * (People to meet and dinner invites) needs age 21 to 45 and a finished profile here; sending an invite also needs the ✓.
 */
const dining = /^\/(people|dinners(\/.*)?)$/;
social.use(async (req, res, next) => {
  try { if (dining.test(req.path)) requireBrowse(await standing(res.locals.user.id)); next(); }
  catch (error) { next(error); }
});
social.use(profile);
social.use(verify);
// Before people: /people/find would otherwise reach /people/:id.
social.use(handles);
social.use(people);
social.use(friends);
social.use(dinners);
social.use(places);
social.use(errors);
