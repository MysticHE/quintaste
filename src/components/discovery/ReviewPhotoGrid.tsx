import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useListingSource } from "../market/ListingPhoto";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { thumbPath } from "../../services/place-reviews-api";
import type { ReviewGalleryPhoto } from "../../types/place-reviews";
import { useT } from "../../i18n";

const GAP = 4;
type Box = { left: number; top: number; width: number; height: number };

/** Where up to five tiles sit: one wide; two side by side; three or more as one large tile beside a column or 2 × 2 of small ones. */
function boxes(count: number, width: number): { height: number; tiles: Box[] } {
  if (count === 1) return { height: width * 9 / 16, tiles: [{ left: 0, top: 0, width, height: width * 9 / 16 }] };
  if (count === 2) { const half = (width - GAP) / 2; return { height: half, tiles: [0, 1].map(i => ({ left: i * (half + GAP), top: 0, width: half, height: half })) }; }
  const height = Math.round(width * 0.5), big = Math.round((width - GAP) * 0.58), rest = width - big - GAP, row = (height - GAP) / 2;
  const tiles: Box[] = [{ left: 0, top: 0, width: big, height }], x = big + GAP, small = count - 1;
  if (small === 2) tiles.push({ left: x, top: 0, width: rest, height: row }, { left: x, top: row + GAP, width: rest, height: row });
  else {
    const cell = (rest - GAP) / 2;
    tiles.push({ left: x, top: 0, width: cell, height: row }, { left: x + cell + GAP, top: 0, width: cell, height: row });
    tiles.push(small === 3 ? { left: x, top: row + GAP, width: rest, height: row } : { left: x, top: row + GAP, width: cell, height: row });
    if (small === 4) tiles.push({ left: x + cell + GAP, top: row + GAP, width: cell, height: row });
  }
  return { height, tiles };
}
/** The place's review photos as a mosaic of up to five; the last tile counts the rest and opens every photo. */
export function ReviewPhotoGrid({ photos, total, onOpen, onAll }: {
  photos: ReviewGalleryPhoto[]; total: number; onOpen: (index: number) => void; onAll: () => void;
}) {
  const [width, setWidth] = useState(0), shown = photos.slice(0, 5), more = Math.max(0, total - shown.length);
  const layout = width ? boxes(shown.length, width) : null;
  return <View testID="review-photo-grid" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: layout?.height ?? 0 }}>
    {layout?.tiles.map((box, i) => <Tile key={shown[i].url} photo={shown[i]} box={box} more={i === shown.length - 1 ? more : 0}
      onPress={() => i === shown.length - 1 && more ? onAll() : onOpen(i)} />)}
  </View>;
}
function Tile({ photo, box, more, onPress }: { photo: ReviewGalleryPhoto; box: Box; more: number; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("explore"), source = useListingSource(), { focused, focusProps } = useKeyboardFocus();
  const [failed, setFailed] = useState(false);
  return <Pressable {...focusProps} accessibilityRole="button" onPress={onPress}
    accessibilityLabel={more ? t("seeAllPhotos", { n: more + 1 }) : t("photoBy", { name: photo.name, stars: photo.rating })}
    style={({ pressed }) => [s.tile, box, { backgroundColor: theme.muted, borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.8 : 1 }]}>
    {failed ? <Icon name="image-outline" color={theme.mutedForeground} />
      : <Image source={source(thumbPath(photo.url))} recyclingKey={photo.url} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessible={false} transition={120} />}
    {more > 0 && <View style={[StyleSheet.absoluteFill, s.more, { backgroundColor: theme.overlay }]}>
      <T variant="subtitle" color={theme.mediaForeground} style={common.bold} numberOfLines={1}>{t("morePhotosTile", { n: more })}</T>
    </View>}
  </Pressable>;
}
const s = StyleSheet.create({
  tile: { position: "absolute", borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  more: { alignItems: "center", justifyContent: "center" },
});
