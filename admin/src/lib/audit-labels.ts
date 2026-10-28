import { CHEFS } from './chef-names';
import { featureName, FEATURES } from './features';

/** Plain words for audit actions ("content.game_level.make" → "Game level made"), for Audit and every item's History. */
const NOUNS: Record<string, string> = { place: 'Place', menu: 'Menu', recipe: 'Recipe', event: 'Event', creator: 'Creator', ingredient: 'Ingredient',
  game_level: 'Game level', game_picture: 'Game picture', game_item: 'Game item', review: 'Place review', cooked: 'Cooked photo', gathering: 'Gathering', listing: 'Market item',
  control: 'Switch', session: 'Sign-in', security_key: 'Security key', deployment: 'Deployment', integration: 'Integration', account: 'Account',
  staff: 'Staff', case: 'Case', seller: 'Shop', teacher: 'Class teacher', photo_check: 'Photo check', chef: 'Chef', editorial: 'Review' };
const VERBS: Record<string, string> = { create: 'created', edit: 'edited', add: 'dishes added', update: 'updated', save: 'saved', hide: 'hidden',
  restore: 'shown again', clear: 'edits cleared', delete: 'deleted', approve: 'approved', approved: 'approved', reject: 'rejected', decline: 'declined',
  publish: 'published', make: 'made', redraw: 'redrawn', review: 'reviewed', changed: 'changed', ai_daily_cap: 'AI daily limit set',
  sign_in: 'signed in', google_verified: 'Google verified', security_key_verified: 'security key verified', registered: 'registered',
  key_set: 'key saved', key_removed: 'key removed', promote: 'promoted', verify: 'verified', suspend: 'suspended', reinstate: 'reinstated',
  remove: 'removed', pin: 'pinned', unpin: 'unpinned', pause: 'paused', activate: 'reactivated', block: 'blocked', undo: 'undone' };
const words = (key: string) => key.replaceAll('_', ' ');
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function actionLabel(action: string) {
  const parts = action.replace(/^content\./, '').split('.'), verb = parts.at(-1)!, noun = parts.slice(0, -1).join('_');
  if (!noun) return sentence(words(verb));
  return sentence(`${NOUNS[noun] ?? words(noun)} ${VERBS[verb] ?? words(verb)}`);
}
/** A switch shows its feature name; a chef lane shows "Chef lane · <lane>"; anything else stays as recorded. */
export function targetLabel(target: string) {
  if (FEATURES[target]) return featureName(target);
  if (target.startsWith('chef_')) return 'Chef lane · ' + sentence(words(target.slice(5)));
  return target;
}
export const actorLabel = (actor: string | null) => (actor && CHEFS[actor]) || actor || 'System';
