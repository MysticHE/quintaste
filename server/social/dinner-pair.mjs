import { CommunityError } from '../community/http.mjs';

/**
 * One dinner at a time per pair (owner, 1 Nov 2026). A dinner is still between two people while an invite waits (not yet
 * lapsed) or a confirmed dinner has not finished: until an hour after it starts, the app's day-of window (isDayOf in
 * src/components/social/DinnerParts.tsx, which also runs Running late). `d` is the social.dinner alias.
 */
export const currentDinnerSql = d => `((${d}.status='invited' AND ${d}.expires_at > now() AND ${d}.starts > now())
  OR (${d}.status='accepted' AND ${d}.starts > now() - interval '1 hour'))`;
/** The dinner `d` is between members `a` and `b` (SQL expressions), whoever invited. */
export const pairSql = (d, a, b) => `((${d}.host_id=${a} AND ${d}.guest_id=${b}) OR (${d}.host_id=${b} AND ${d}.guest_id=${a}))`;
/** Why a second dinner is refused; the app words each code in the member's language. */
export const pairBusyError = status => status === 'invited'
  ? new CommunityError(409, 'There is already an invite waiting between you.', 'SOCIAL_INVITE_WAITING')
  : new CommunityError(409, 'You already have a dinner planned together.', 'SOCIAL_DINNER_AHEAD');
