import { communityRouter, errors } from '../community/http.mjs';
import { people } from './people.mjs';
import { nearby } from './nearby.mjs';
import { groups } from './groups.mjs';
import { plans } from './plans.mjs';
import { tables } from './tables.mjs';
import { gatherings } from './gatherings.mjs';
import { places } from './places.mjs';

/** Every Social route needs a signed-in, age-checked, unrestricted member. */
export const social = communityRouter({ bodyLimit: '64kb' });
social.use(people);
social.use(nearby);
social.use(groups);
social.use(plans);
social.use(tables);
social.use(gatherings);
social.use(places);
social.use(errors);
