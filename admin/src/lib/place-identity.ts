// The rule lives in place-identity.mjs so the app server (server/explore-work) uses the same one.
export { placeUnit, nameTokens, samePlace } from './place-identity.mjs';
export type PlaceIdentity = { name?: string | null; address?: string | null; postalCode?: string | null };
