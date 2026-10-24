/**
 * Member café terms (GAME_CONTENT_PLAN §9; Google Play and Apple 1.2 rules for member-made content). The server checks the version
 * (server/game/cafes.mjs CAFE_TERMS_VERSION). Draft wording: the owner sets the final terms and the published contact details before
 * staff turn the `game_cafes` switch on.
 */
export const CAFE_TERMS_VERSION = 1;
/** Message keys in the `game` namespace (src/i18n/en/game-cafe.ts), shown in the member's language. */
export const CAFE_TERMS = ["cafeTerm1", "cafeTerm2", "cafeTerm3", "cafeTerm4", "cafeTerm5"] as const;
