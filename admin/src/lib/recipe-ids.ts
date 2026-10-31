/** A member or AI recipe's id as the app shows it (server/recipes/rules.mjs `publicId`): `member-` and the row's uuid. */
export const memberRecipePrefix = 'member-';
const pattern = /^member-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Exact, so a QT Manager or staff recipe whose slug happens to start with "member-" still opens its own editor. */
export const isMemberRecipeId = (id: string) => pattern.test(id);
