/** The service switches staff see on Features (ops.control), for the console and the overview alike. Chef lanes are on Kitchen › Chefs. */
type Feature = { name: string; effect: string };
export const FEATURES: Record<string, Feature> = {
  registration: { name: 'Registration', effect: 'New accounts' },
  push: { name: 'Phone alerts', effect: 'Alerts on members’ phones for messages, friends, gifts, dinners and orders' },
  menus: { name: 'Places and menus', effect: 'Explore places, menus and place reviews' },
  discovery: { name: 'Address lookup and photos', effect: 'Postal and address search, Home and Work, place photos and details' },
  areas: { name: 'Area counts', effect: 'Home and Work area counts' },
  recipes: { name: 'Member recipes', effect: 'Sharing recipes from Cook' },
  ai_recipes: { name: 'AI recipes', effect: 'Asking for a recipe or reading one from a video' },
  ai_recipes_bots: { name: 'Written by', effect: 'Gemini or the QT bots' },
  recipe_demand: { name: 'Wanted recipes', effect: 'Writes recipes members search for and can’t find, up to 10 a day' },
  avatars: { name: 'Avatars', effect: 'Avatar portraits and lotus breeding' },
  social: { name: 'Social', effect: 'Profiles, friends, chats and gatherings' },
  market: { name: 'Market buying', effect: 'Browsing and ordering' },
  market_sellers: { name: 'Market selling', effect: 'Opening and running a shop, and classes' },
  games: { name: 'Game progress', effect: 'Saving progress and café credits; the game still plays' },
  game_levels: { name: 'Recipe levels', effect: 'Turning recipes staff choose into game levels' },
  game_seasons: { name: 'Seasons', effect: 'The Seasons shelf and new season runs' },
  collection: { name: 'Collection', effect: 'Credits from tasks, avatar borders and badges' },
  gifts: { name: 'Gifts', effect: 'Sending gifts and the free weekly Rose (paid gifts need the store build)' },
};
/** Features, top to bottom. AI recipes carries its engine and Wanted recipes beneath it. */
export const GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ['Accounts', ['registration', 'push']], ['Explore', ['menus', 'discovery', 'areas']], ['Cook', ['recipes', 'ai_recipes', 'avatars']],
  ['Social and Market', ['social', 'gifts', 'market', 'market_sellers']], ['Game', ['games', 'game_levels', 'game_seasons', 'collection']]];
export const AI_SETTINGS = ['ai_recipes_bots', 'recipe_demand'] as const;
/** What a feature needs on to run (the server checks the same switches). */
export const NEEDS: Record<string, readonly string[]> = { ai_recipes: ['recipes'], recipe_demand: ['ai_recipes', 'recipes'],
  game_levels: ['games', 'recipes'], game_seasons: ['games'], collection: ['games'], gifts: ['social', 'collection'] };
/** Not shown: "AI features" and "Identity review" were retired placeholders (owner, 19 Oct 2026); member cafés wait for their terms. */
export const HIDDEN = ['ai', 'identity', 'game_cafes'];
/** Switches that are not on/off features: the AI engine choice and the chef lanes. */
export const isFeature = (key: string) => !HIDDEN.includes(key) && key !== 'ai_recipes_bots' && !key.startsWith('chef_');
export const featureName = (key: string) => FEATURES[key]?.name ?? key.replaceAll('_', ' ');
