import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MarketModal } from "../market/MarketChrome";
import { useListingSource } from "../market/ListingPhoto";
import { Button, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** Review photo thumbnails that open full size; `strip` lays them in one sideways-scrolling row (the place page). */
export function ReviewPhotos({ photos, strip = false }: { photos: string[]; strip?: boolean }) {
  const source = useListingSource(), { theme } = usePreferences(), [opened, setOpened] = useState<number | null>(null);
  const [failed, setFailed] = useState<string[]>([]), t = useT("explore");
  const thumbs = photos.map((path, i) =>
    <Pressable key={path} accessibilityRole="button" accessibilityLabel={t("viewReviewPhoto", { n: i + 1 })} onPress={() => setOpened(i)}
      style={({ pressed }) => [{ width: 76, height: 76, borderRadius: 10, overflow: "hidden", backgroundColor: theme.muted, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }]}>
      {failed.includes(path) ? <Icon name="image-outline" /> : <Image source={source(path)} cachePolicy="none" contentFit="cover" style={StyleSheet.absoluteFill}
        onError={() => setFailed(previous => [...previous, path])} accessible={false} />}
    </Pressable>);
  return <>
    {strip ? <ScrollView testID="review-photo-strip" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{thumbs}</ScrollView>
      : <View testID="review-photos" style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{thumbs}</View>}
    <MarketModal visible={opened !== null} label={t("reviewPhotoOf", { n: (opened ?? 0) + 1, total: photos.length })} onClose={() => setOpened(null)}>
      {opened !== null && <View style={{ width: "100%", aspectRatio: 1, maxHeight: 420, backgroundColor: theme.mediaSurface, borderRadius: 12, overflow: "hidden" }}>
        {failed.includes(photos[opened]) ? <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><T color={theme.mediaForeground}>{t("photoUnavailable")}</T></View>
          : <Image source={source(photos[opened])} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel={t("reviewPhoto", { n: opened + 1 })}
            onError={() => setFailed(previous => [...previous, photos[opened]])} />}
      </View>}
      {photos.length > 1 && <View style={common.spread}>
        <Button label={t("previousShort")} variant="link" disabled={opened === 0} onPress={() => setOpened(value => Math.max(0, (value ?? 0) - 1))} />
        <Button label={t("nextShort")} variant="link" disabled={opened === photos.length - 1} onPress={() => setOpened(value => Math.min(photos.length - 1, (value ?? 0) + 1))} />
      </View>}
    </MarketModal>
  </>;
}
