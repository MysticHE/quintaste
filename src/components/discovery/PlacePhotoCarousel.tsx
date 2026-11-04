import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import type { WebOnlyProps } from "../../types/web-props";
import type { CataloguePhoto } from "../../types/catalogue";
import type { ReviewGalleryPhoto } from "../../types/place-reviews";
import { useListingSource } from "../market/ListingPhoto";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { CataloguePhotoBackdrop } from "./CataloguePhotoBackdrop";
import { PhotoCredit } from "./PlaceDetailParts";

const MAX_REVIEW_SLIDES = 8;

/**
 * The place page's photos: the cover first, then up to eight members' review photos. Swipe (arrow keys on the web, adjust
 * actions for screen readers); tapping a review photo opens the full-screen viewer at that photo. The cover's credit shows
 * under the cover; a review photo names its member.
 */
export function PlacePhotoCarousel({ cover, photos, open, onPhoto }: {
  cover?: CataloguePhoto; photos: ReviewGalleryPhoto[]; open: (url: string) => void; onPhoto: (index: number) => void;
}) {
  const { theme, reducedMotion } = usePreferences(), t = useT("explore"), source = useListingSource();
  const reviews = photos.slice(0, MAX_REVIEW_SLIDES), offset = cover ? 1 : 0, count = offset + reviews.length;
  const scroll = useRef<ScrollViewInstance>(null), current = useRef(0);
  const [width, setWidth] = useState(0), [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const show = (next: number) => {
    setVisited(previous => previous.has(next) ? previous : new Set([...previous, next]));
    current.current = next; setIndex(next);
  };
  const move = (delta: number) => {
    const next = Math.max(0, Math.min(count - 1, current.current + delta));
    show(next); scroll.current?.scrollTo({ x: next * width, animated: !reducedMotion });
  };
  const track = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const position = Math.max(0, Math.min(count - 1, event.nativeEvent.contentOffset.x / width));
    setVisited(previous => [Math.floor(position), Math.ceil(position)].every(n => previous.has(n)) ? previous : new Set([...previous, Math.floor(position), Math.ceil(position)]));
    const next = Math.round(position);
    if (next !== current.current) { current.current = next; setIndex(next); }
  };
  useEffect(() => { if (width) scroll.current?.scrollTo({ x: current.current * width, animated: false }); }, [width]);
  if (!count) return null;
  // A shorter list (a review deleted or hidden) never leaves the carousel past its last photo.
  const at = Math.min(index, count - 1), review = at >= offset ? reviews[at - offset] : undefined;
  const keyboard: WebOnlyProps = Platform.OS === "web" && count > 1 ? { tabIndex: 0, "aria-valuemin": 1, "aria-valuemax": count, "aria-valuenow": at + 1,
    "aria-valuetext": t("placePhotoOf", { n: at + 1, total: count }), onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
      else if ((event.key === "Enter" || event.key === " ") && review) { event.preventDefault(); onPhoto(at - offset); }
    } } : {};
  return <View style={s.wrap}>
    <View testID="catalogue-place-photo" style={[s.frame, { backgroundColor: theme.mediaSurface }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessible={count > 1} accessibilityRole={count > 1 ? "adjustable" : undefined} accessibilityLabel={t("photos")}
      accessibilityValue={count > 1 ? { min: 1, max: count, now: at + 1, text: t("placePhotoOf", { n: at + 1, total: count }) } : undefined}
      accessibilityActions={count > 1 ? [{ name: "increment", label: t("nextPhoto") }, { name: "decrement", label: t("previousPhoto") }, ...(review ? [{ name: "activate", label: t("photoBy", { name: review.name, stars: review.rating }) }] : [])] : undefined}
      onAccessibilityAction={event => { const action = event.nativeEvent.actionName; if (action === "activate") { if (review) onPhoto(at - offset); } else move(action === "increment" ? 1 : -1); }} {...keyboard}>
      {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={track} scrollEventThrottle={32}
        testID="place-photo-slides" scrollEnabled={count > 1}>
        {cover && <View style={{ width, height: "100%" }}>
          <CataloguePhotoBackdrop key={cover.path} path={cover.path} thumbhash={cover.thumbhash} enabled panelHeight={0} />
        </View>}
        {reviews.map((photo, i) => <Pressable key={photo.url} onPress={() => onPhoto(i)} style={{ width, height: "100%" }}
          // One photo alone is its own button; with more, the adjustable frame above speaks for them and opens the one shown.
          accessible={count === 1} tabIndex={count === 1 ? 0 : -1} accessibilityRole="button" accessibilityLabel={t("photoBy", { name: photo.name, stars: photo.rating })}>
          {visited.has(i + offset) || Math.abs(i + offset - at) <= 1
            ? <Image source={source(photo.url)} recyclingKey={photo.url} contentFit="cover" style={StyleSheet.absoluteFill} transition={reducedMotion ? 0 : 150} accessible={false} />
            : null}
        </Pressable>)}
      </ScrollView>}
      {count > 1 && <View pointerEvents="none" style={s.overlay}>
        <View style={[s.pill, { backgroundColor: theme.mediaControl }]}>
          {review ? <T variant="caption" color={theme.mediaForeground} style={common.bold} numberOfLines={1}>{review.name}</T>
            : <T variant="caption" color={theme.mediaForeground} style={common.bold} numberOfLines={1}>{t("coverPhoto")}</T>}
        </View>
        <View style={[s.pill, { backgroundColor: theme.mediaControl }]}>
          <Icon name="images-outline" size={13} color={theme.mediaForeground} />
          <T variant="caption" color={theme.mediaForeground} style={common.bold} numberOfLines={1}>{at + 1} / {count}</T>
        </View>
      </View>}
    </View>
    {cover && at === 0 && <PhotoCredit photo={cover} open={open} />}
  </View>;
}
const s = StyleSheet.create({
  wrap: { gap: 2 },
  frame: { aspectRatio: 16 / 9, maxHeight: 240, borderRadius: 18, overflow: "hidden" },
  overlay: { position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: "60%", flexShrink: 1 },
});
