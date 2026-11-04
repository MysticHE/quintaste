import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../food/Controls";
import { Initial } from "../GroupedList";
import { useListingSource } from "../market/ListingPhoto";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { thumbPath } from "../../services/place-reviews-api";
import type { ReviewGalleryPhoto } from "../../types/place-reviews";
import { useLanguage, useT } from "../../i18n";
import { reviewDate } from "../../utils/review-date";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";

/**
 * Full-screen review photos: swipe (or arrow keys and the side buttons on the web) through every photo, each shown whole over a
 * blurred copy of itself, with its reviewer, stars and opening words (See review shows the whole review right here) and a
 * strip of thumbnails. `onEnd` asks for the next page once each time a photo near the end of the loaded ones comes into view,
 * never again on its own after a failed page (swiping on asks again).
 */
export function ReviewPhotoViewer({ photos, total, start, onClose, onReport, reportable, onEnd }: {
  photos: ReviewGalleryPhoto[]; total: number; start: number; onClose: () => void;
  onReport?: (photo: ReviewGalleryPhoto) => void; reportable?: (photo: ReviewGalleryPhoto) => boolean; onEnd?: () => void;
}) {
  const { theme, reducedMotion } = usePreferences(), t = useT("explore"), language = useLanguage(), source = useListingSource();
  const { width, height } = useWindowDimensions(), insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(""), [clipped, setClipped] = useState(""), endRef = useRef(onEnd);
  useEffect(() => { endRef.current = onEnd; }, [onEnd]);
  const [index, setIndex] = useState(Math.min(start, Math.max(0, photos.length - 1))), [pageHeight, setPageHeight] = useState(0);
  const pages = useRef<FlatList<ReviewGalleryPhoto>>(null), strip = useRef<FlatList<ReviewGalleryPhoto>>(null);
  const photo = photos[index], count = Math.max(total, photos.length);
  const go = (next: number, animated = !reducedMotion) => {
    const value = Math.max(0, Math.min(photos.length - 1, next));
    setIndex(value); pages.current?.scrollToIndex({ index: value, animated });
  };
  useEffect(() => { if (index >= photos.length - 3) endRef.current?.(); }, [index, photos.length]);
  // The chosen thumbnail sits in the middle of the strip when it can.
  useEffect(() => { strip.current?.scrollToOffset({ offset: Math.max(0, STRIP_PAD + THUMB_STEP * index - (width - THUMB) / 2), animated: !reducedMotion }); }, [index, width, reducedMotion]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1); else if (event.key === "ArrowLeft") go(index - 1); else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < photos.length) setIndex(next);
  };
  if (!photo) return null;
  // Long reviews are cut at two lines; the web reports no text layout, so length decides there (and before layout on phones).
  const open = expanded === photo.url, long = photo.body.length > 110 || clipped === photo.url;
  return <Modal visible transparent={false} animationType={reducedMotion ? "none" : "fade"} onRequestClose={onClose} statusBarTranslucent>
    <View testID="review-photo-viewer" style={[s.screen, { backgroundColor: theme.mediaSurface, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={s.header}>
        <IconButton appearance="media" label={t("closePhotos")} icon="close" onPress={onClose} />
        <T variant="small" color={theme.mediaForeground} style={common.bold} accessibilityLiveRegion="polite"
          accessibilityLabel={t("reviewPhotoOf", { n: index + 1, total: count })}>{index + 1} / {count}</T>
        {onReport && (reportable?.(photo) ?? true) ? <IconButton appearance="media" label={t("reportReviewOfPhoto")} icon="flag-outline" onPress={() => onReport(photo)} /> : <View style={s.spacer} />}
      </View>
      <View style={common.flex} onLayout={event => setPageHeight(event.nativeEvent.layout.height)}>
        {pageHeight > 0 && <FlatList ref={pages} data={photos} keyExtractor={item => item.url} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          initialScrollIndex={index} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} windowSize={3} initialNumToRender={1}
          onMomentumScrollEnd={settle} onScroll={Platform.OS === "web" ? settle : undefined} scrollEventThrottle={64}
          renderItem={({ item }) => <View style={{ width, height: pageHeight }}>
            <Image source={source(thumbPath(item.url))} blurRadius={28} contentFit="cover" style={[StyleSheet.absoluteFill, s.backdrop]} accessible={false} />
            <Image source={source(item.url)} contentFit="contain" style={StyleSheet.absoluteFill} transition={reducedMotion ? 0 : 150}
              accessibilityLabel={t("photoBy", { name: item.name, stars: item.rating })} />
          </View>} />}
        {Platform.OS === "web" && width >= 600 && <>
          {index > 0 && <View style={[s.side, { left: 12 }]}><IconButton appearance="media" label={t("previousPhoto")} icon="chevron-back" onPress={() => go(index - 1)} /></View>}
          {index < photos.length - 1 && <View style={[s.side, { right: 12 }]}><IconButton appearance="media" label={t("nextPhoto")} icon="chevron-forward" onPress={() => go(index + 1)} /></View>}
        </>}
      </View>
      <View style={[s.info, { maxWidth: Math.min(width, 640) }]}>
        <View style={[common.row, { gap: 10 }]}>
          <Initial name={photo.name} size={36} />
          <View style={[common.flex, { minWidth: 0 }]}>
            <T variant="small" color={theme.mediaForeground} style={common.bold} numberOfLines={1}>{photo.name}</T>
            <T variant="caption" color={theme.mediaMutedForeground} numberOfLines={1}>{reviewDate(photo.createdAt, language)}</T>
          </View>
          <View style={s.stars} accessible accessibilityRole="image" accessibilityLabel={t("starsOutOf", { n: photo.rating })}>
            {[1, 2, 3, 4, 5].map(star => <Icon key={star} name={star <= photo.rating ? "star" : "star-outline"} size={14} color={theme.mediaRating} />)}
          </View>
        </View>
        {!!photo.body && <ScrollView style={{ maxHeight: open ? height * 0.3 : undefined }} showsVerticalScrollIndicator={open}>
          <T key={photo.url} variant="small" color={theme.mediaMutedForeground} numberOfLines={open ? undefined : 2} selectable={open}
            onTextLayout={event => { if (!open && event.nativeEvent.lines.length > 2) setClipped(photo.url); }}>{photo.body}</T>
        </ScrollView>}
        {!!photo.body && (long || open) && <SeeReview open={open} onPress={() => setExpanded(open ? "" : photo.url)} />}
      </View>
      {photos.length > 1 && <FlatList ref={strip} data={photos} keyExtractor={item => item.url} horizontal showsHorizontalScrollIndicator={false}
        style={s.stripList} contentContainerStyle={s.strip} getItemLayout={(_, i) => ({ length: THUMB_STEP, offset: STRIP_PAD + THUMB_STEP * i, index: i })} onEndReached={() => endRef.current?.()} onEndReachedThreshold={0.5}
        onScrollToIndexFailed={() => undefined}
        renderItem={({ item, index: i }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: i === index }}
          accessibilityLabel={t("reviewPhotoOf", { n: i + 1, total: count })} onPress={() => go(i)}
          style={[s.thumb, { borderColor: i === index ? theme.mediaRating : theme.transparent, opacity: i === index ? 1 : 0.6 }]}>
          <Image source={source(thumbPath(item.url))} contentFit="cover" style={s.thumbImage} recyclingKey={item.url} accessible={false} />
        </Pressable>} />}
    </View>
  </Modal>;
}
function SeeReview({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("explore"), { focused, focusProps } = useKeyboardFocus();
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={onPress}
    style={[s.link, { borderColor: focused ? theme.mediaForeground : theme.transparent }]}>
    <T variant="small" color={theme.mediaRating} style={common.bold} numberOfLines={1}>{t(open ? "showLess" : "seeReview")}</T>
  </Pressable>;
}
const THUMB = 52, THUMB_STEP = THUMB + 6, STRIP_PAD = 16;
const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, minHeight: 56 },
  spacer: { width: 48 },
  backdrop: { opacity: 0.45 },
  side: { position: "absolute", top: "50%", marginTop: -24 },
  info: { gap: 8, paddingHorizontal: 16, paddingTop: 14, width: "100%", alignSelf: "center" },
  stars: { flexDirection: "row", gap: 2 },
  link: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", borderWidth: 2, borderRadius: 8, paddingHorizontal: 4, marginLeft: -6 },
  stripList: { flexGrow: 0, flexShrink: 0 },
  strip: { gap: THUMB_STEP - THUMB, paddingHorizontal: STRIP_PAD, paddingTop: 12 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, borderWidth: 2, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
});
