/** Adds the item when it is missing, removes it when present; returns a new list. */
export const toggleItem = <T,>(list: readonly T[], item: T): T[] => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
