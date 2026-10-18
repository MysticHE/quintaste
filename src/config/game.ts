/**
 * Rush Hour and My little café stay off for members until production acceptance: the `games` control is locked in the
 * staff console (admin/src/lib/management.ts) and no server route serves the game yet. Development builds show it.
 */
const dev = typeof __DEV__ !== "undefined" && __DEV__;
export const gameEnabled = dev;
/** Development builds may preview lotus tiers before the Lotus Avatar flow and payments exist. Release builds ignore a stored tier. */
export const gamePreviewTools = dev;
