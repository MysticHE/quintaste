import { communityRouter, errors } from '../community/http.mjs';
import { people } from './people.mjs';
import { groups } from './groups.mjs';
import { gatherings } from './gatherings.mjs';

/** Every Social route needs a signed-in, age-checked, unrestricted member. */
export const social = communityRouter({ bodyLimit: '64kb' });
social.use(people);
social.use(groups);
social.use(gatherings);
social.use(errors);
