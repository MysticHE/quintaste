import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MarketModal } from "../market/MarketChrome";
import { useListingSource } from "../market/ListingPhoto";
import { Button, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";

export function ReviewPhotos({ photos }: { photos: string[] }) {
  const source = useListingSource(), { theme } = usePreferences(), [opened, setOpened] = useState<number | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  return <>
    <View testID="review-photos" style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{photos.map((path, i) =>
      <Pressable key={path} accessibilityRole="button" accessibilityLabel={"View review photo " + (i + 1)} onPress={() => setOpened(i)}
        style={({ pressed }) => [{ width: 76, height: 76, borderRadius: 10, overflow: "hidden", backgroundColor: theme.muted, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }]}>
        {failed.includes(path) ? <Icon name="image-outline" /> : <Image source={source(path)} cachePolicy="none" contentFit="cover" style={StyleSheet.absoluteFill}
          onError={() => setFailed(previous => [...previous, path])} accessible={false} />}
      </Pressable>)}</View>
    <MarketModal visible={opened !== null} label={"Review photo " + ((opened ?? 0) + 1) + " of " + photos.length} onClose={() => setOpened(null)}>
      {opened !== null && <View style={{ width: "100%", aspectRatio: 1, maxHeight: 420, backgroundColor: theme.mediaSurface, borderRadius: 12, overflow: "hidden" }}>
        {failed.includes(photos[opened]) ? <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><T color={theme.mediaForeground}>Photo unavailable</T></View>
          : <Image source={source(photos[opened])} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel={"Review photo " + (opened + 1)}
            onError={() => setFailed(previous => [...previous, photos[opened]])} />}
      </View>}
      {photos.length > 1 && <View style={common.spread}>
        <Button label="Previous" variant="link" disabled={opened === 0} onPress={() => setOpened(value => Math.max(0, (value ?? 0) - 1))} />
        <Button label="Next" variant="link" disabled={opened === photos.length - 1} onPress={() => setOpened(value => Math.min(photos.length - 1, (value ?? 0) + 1))} />
      </View>}
    </MarketModal>
  </>;
}
