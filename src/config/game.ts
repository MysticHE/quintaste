/**
 * Rush Hour and My little café are live for everyone (owner decision, 19 October 2026). This build flag stays on; the
 * staff console's `games` control switches the game off at runtime (useGameSwitch). Members' progress is saved to the
 * account by server replay (server/game); guests' stays on the device in FoodDocument.game.
 */
const dev = typeof __DEV__ !== "undefined" && __DEV__;
export const gameEnabled = true;
/** Development builds may preview lotus tiers before the Lotus Avatar flow and payments exist. Release builds ignore a stored tier. */
export const gamePreviewTools = dev;
