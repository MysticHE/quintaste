/**
 * Member café terms (GAME_CONTENT_PLAN §9; Google Play and Apple 1.2 rules for member-made content). The server checks the version
 * (server/game/cafes.mjs CAFE_TERMS_VERSION). Draft wording: the owner sets the final terms and the published contact details before
 * staff turn the `game_cafes` switch on.
 */
export const CAFE_TERMS_VERSION = 1;
export const CAFE_TERMS = [
  "Members who are signed in can visit your café. They see its name and its menu, never your area or contact details.",
  "Only reviewed recipe levels go on your menu, up to six.",
  "Keep the name friendly: no links, emails, phone numbers or anything that would upset other members.",
  "Members can report your café, and QuinTaste staff can close it after a report.",
  "Your café earns no money or credits from visitors. Only you see how many guests it served.",
];
