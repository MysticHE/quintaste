import { StyleSheet } from "react-native";

/** Side gutter between the screen edge and content, shared by every screen. */
export const SCREEN_GUTTER = 16;
/** Explore grid and place details share equal gutters/gaps and restrained corners (owner, 28 Oct 2026). */
export const catalogueLayout = { gap: 12, radius: 4, thumbnailHeight: 88 } as const;
/** Photo cards sit closer to the screen edge than text and controls. */
export const PHOTO_CARD_INSET = 6;
/** Pulls a photo card out of the screen gutter to its inset. */
export const photoCardBleed = { marginHorizontal: PHOTO_CARD_INSET - SCREEN_GUTTER };
/** Horizontal scroll rows run to the screen edge while their first item lines up with the gutter. */
export const edgeScroll = StyleSheet.create({ row: { marginHorizontal: -SCREEN_GUTTER }, content: { paddingHorizontal: SCREEN_GUTTER } });
