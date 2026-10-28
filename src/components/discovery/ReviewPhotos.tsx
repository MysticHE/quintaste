import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MarketModal } from "../market/MarketChrome";
import { useListingSource } from "../market/ListingPhoto";
import { Button, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/**
 * Members' photo thumbnails that open full size, with previous/next. `strip` lays them in one sideways-scrolling row. Place
 * reviews use the defaults; cooked photos name each photo (`label`), add its author and note (`caption`) and own/report actions
 * (`actions`, given a close function), and keep photos in memory (`cache`) since their paths change with their content.
 */
export function ReviewPhotos({ photos, strip = false, label, caption, actions, cache = false }: {
  photos: string[]; strip?: boolean; label?: (index: number) => string; caption?: (index: number) => ReactNode;
  actions?: (index: number, close: () => void) => ReactNode; cache?: boolean;
}) {
  const source = useListingSource(), { theme } = usePreferences(), [opened, setOpened] = useState<number | null>(null);
  const [failed, setFailed] = useState<string[]>([]), t = useT("explore"), cachePolicy = cache ? "memory" : "none";
  const name = (index: number) => label?.(index) ?? t("reviewPhoto", { n: index + 1 }), close = () => setOpened(null);
  const thumbs = photos.map((path, i) =>
    <Pressable key={path} accessibilityRole="button" accessibilityLabel={label ? label(i) : t("viewReviewPhoto", { n: i + 1 })} onPress={() => setOpened(i)}
      style={({ pressed }) => [s.thumb, { backgroundColor: theme.muted, opacity: pressed ? 0.7 : 1 }]}>
      {failed.includes(path) ? <Icon name="image-outline" /> : <Image source={source(path)} cachePolicy={cachePolicy} contentFit="cover" style={StyleSheet.absoluteFill}
        onError={() => setFailed(previous => [...previous, path])} accessible={false} />}
    </Pressable>);
  return <>
    {strip ? <ScrollView testID="review-photo-strip" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{thumbs}</ScrollView>
      : <View testID="review-photos" style={[s.row, s.wrap]}>{thumbs}</View>}
    <MarketModal visible={opened !== null} label={label && opened !== null ? name(opened) : t("reviewPhotoOf", { n: (opened ?? 0) + 1, total: photos.length })} onClose={close}>
      {opened !== null && <View style={[s.large, { backgroundColor: theme.mediaSurface }]}>
        {failed.includes(photos[opened]) ? <View style={s.missing}><T color={theme.mediaForeground}>{t("photoUnavailable")}</T></View>
          : <Image source={source(photos[opened])} cachePolicy={cachePolicy} contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel={name(opened)}
            onError={() => setFailed(previous => [...previous, photos[opened]])} />}
      </View>}
      {opened !== null && caption?.(opened)}
      {opened !== null && actions?.(opened, close)}
      {photos.length > 1 && <View style={common.spread}>
        <Button label={t("previousShort")} variant="link" disabled={opened === 0} onPress={() => setOpened(value => Math.max(0, (value ?? 0) - 1))} />
        <Button label={t("nextShort")} variant="link" disabled={opened === photos.length - 1} onPress={() => setOpened(value => Math.min(photos.length - 1, (value ?? 0) + 1))} />
      </View>}
    </MarketModal>
  </>;
}
const s = StyleSheet.create({
  row: { gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  thumb: { width: 76, height: 76, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  large: { width: "100%", aspectRatio: 1, maxHeight: 420, borderRadius: 12, overflow: "hidden" },
  missing: { flex: 1, justifyContent: "center", alignItems: "center" },
});
