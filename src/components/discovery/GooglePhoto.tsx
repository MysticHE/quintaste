import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { LivePhoto } from "../../types/discovery";
import { usePhotoData } from "../../hooks/usePhotoData";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";
import { useT } from "../../i18n";

export function GooglePhotoImage({ photo, name, expiresAt, style, background = false, contain = false, enabled = true }: {
  photo?: LivePhoto; name: string; expiresAt: number; style?: StyleProp<ViewStyle>; background?: boolean; contain?: boolean; enabled?: boolean;
}) {
  const { theme } = usePreferences(), { uri, failed, fail } = usePhotoData(photo?.url, expiresAt, enabled), t = useT("explore");
  const media = background || contain, foreground = media ? theme.mediaMutedForeground : theme.mutedForeground;
  return <View style={[{ backgroundColor: background || contain ? theme.mediaSurface : theme.accentSoft }, style]}
    pointerEvents="none" accessibilityElementsHidden={background} importantForAccessibility={background ? "no-hide-descendants" : "auto"}>
    {uri ? <Image source={{ uri }} cachePolicy="none" contentFit={contain ? "contain" : "cover"} style={StyleSheet.absoluteFill}
      accessible={!background} accessibilityLabel={t("googlePhotoOf", { name })} onError={fail} />
      : failed || !photo ? <View style={[s.placeholder, background && s.backgroundPlaceholder]}><Icon name="image-outline" color={foreground} />
        <T variant="small" color={foreground}>{t("photoUnavailable")}</T></View>
        : <ActivityIndicator accessibilityLabel={t("loadingPhotoOf", { name })} style={[s.spinner, background && s.backgroundSpinner]} color={media ? theme.mediaForeground : theme.accent} />}
  </View>;
}
export function GooglePhotoCredits({ photo, onMedia = false, includeSource = true, onError, compact = false }: {
  photo: LivePhoto; onMedia?: boolean; includeSource?: boolean; compact?: boolean; onError?: (text: string) => void;
}) {
  const { theme, setNotice } = usePreferences(), t = useT("explore");
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { if (onError) onError(t("photoSourceFailed")); else setNotice({ text: t("photoSourceFailedShort"), error: true }); }
  };
  const color = onMedia ? theme.mediaMutedForeground : theme.accent;
  return <View style={[s.credits, compact && s.compactCredits]}><View style={compact && common.flex}>{photo.authors.map((author, index) => <View key={index} style={[common.row, { gap: 6 }]}>
      {!!author.photoUri && <Image source={{ uri: author.photoUri }} cachePolicy="none" style={[s.avatar, (onMedia || compact) && s.smallAvatar]} accessible={false} />}
      {author.uri ? <Pressable accessibilityRole="link" accessibilityLabel={t("photoByProfile", { name: author.name })}
        onPress={() => void open(author.uri!)} style={s.link}><T variant="small" color={color} numberOfLines={compact ? 1 : undefined} style={{ minWidth: 0, flexShrink: 1 }}>{compact ? author.name : t("photoCredit", { name: author.name })}</T></Pressable>
        : <T variant="small" color={color} style={{ flexShrink: 1 }}>{compact ? author.name : t("photoCredit", { name: author.name })}</T>}
    </View>)}</View>{includeSource && !!photo.sourceUri && <Pressable accessibilityRole="link" onPress={() => void open(photo.sourceUri!)} style={s.link}>
      <T variant="small" color={color}>{compact ? "Google Maps" : t("viewPhotoInMaps")}</T></Pressable>}</View>;
}
export function GooglePhoto({ photo, name, expiresAt, compact = false }: { photo: LivePhoto; name: string; expiresAt: number; compact?: boolean }) {
  return <View style={[s.container, compact && s.compact]}>
    <GooglePhotoImage key={photo.url} photo={photo} name={name} expiresAt={expiresAt} style={[s.image, compact && s.thumbnail]} />
    {!compact && <GooglePhotoCredits photo={photo} />}
  </View>;
}
const s = StyleSheet.create({
  container: { gap: 4 }, compact: { width: 86 }, image: { width: "100%", aspectRatio: 1.8, borderRadius: 14, overflow: "hidden" },
  thumbnail: { width: 86, height: 86, aspectRatio: 1 }, placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  backgroundPlaceholder: { position: "absolute", top: 22, left: 16, right: 74, flexDirection: "row", justifyContent: "flex-start" },
  spinner: { position: "absolute", alignSelf: "center", top: "40%" }, backgroundSpinner: { top: 36 },
  avatar: { width: 32, height: 32, borderRadius: 16 }, smallAvatar: { width: 22, height: 22, borderRadius: 11 },
  credits: { gap: 4, flexShrink: 1 }, compactCredits: { flexDirection: "row", alignItems: "center", gap: 10 },
  link: { minHeight: 48, justifyContent: "center", flexShrink: 1 },
});
