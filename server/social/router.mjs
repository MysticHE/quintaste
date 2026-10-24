import { communityRouter, errors } from '../community/http.mjs';
import { profile } from './profile.mjs';
import { verify } from './verify.mjs';
import { people } from './people.mjs';
import { friends } from './friends.mjs';
import { dinners } from './dinners.mjs';
import { places } from './places.mjs';
import { requireBrowse, standing } from './access.mjs';

/** Profile photos (1 MB) and the live selfie (2 MB) arrive as data URIs, one per request; everything else stays small. */
const photoRoute = req => req.method === 'POST' && (req.path === '/me/photos' || req.path === '/me/verify');
/** Every Social route needs a signed-in, age-checked, unrestricted member. */
export const social = communityRouter({ bodyLimit: '64kb', photoLimit: '3mb', photos: photoRoute });
/**
 * Social is for members aged 21 to 45 with a finished profile: every route needs that standing, except your own profile,
 * photos and photo check (to set up), photo files (each checks who may see it) and place search (for favourite places).
 */
const ownSetup = /^\/(me(\/photos(\/[^/]+)?|\/photos\/order|\/verify(\/pose)?)?|photos\/[^/]+|places)$/;
social.use(async (req, res, next) => {
  try { if (!ownSetup.test(req.path)) requireBrowse(await standing(res.locals.user.id)); next(); }
  catch (error) { next(error); }
});
social.use(profile);
social.use(verify);
social.use(people);
social.use(friends);
social.use(dinners);
social.use(places);
social.use(errors);
