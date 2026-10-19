/**
 * Rush Hour and My little café are live for everyone (owner decision, 19 October 2026). The game has no server route,
 * so the staff console's `games` control does not gate it; progress stays on the device in FoodDocument.game.
 */
const dev = typeof __DEV__ !== "undefined" && __DEV__;
export const gameEnabled = true;
/** Development builds may preview lotus tiers before the Lotus Avatar flow and payments exist. Release builds ignore a stored tier. */
export const gamePreviewTools = dev;
