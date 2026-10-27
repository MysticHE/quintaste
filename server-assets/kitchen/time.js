/** A promise that settles after `ms` milliseconds; shared by the kitchen's world and its ticket bubbles. */
export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
