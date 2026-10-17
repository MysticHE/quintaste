import { Pressable, StyleSheet, View } from "react-native";
import type { LivePlace } from "../../types/discovery";
import type { livePlaceMetadata } from "../../utils/live-place-format";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";

export function LivePlaceInformation({ place, meta, measurePanel, measureName, onSource }: {
  place: LivePlace; meta: ReturnType<typeof livePlaceMetadata>;
  measurePanel: (height: number) => void; measureName: (height: number) => void; onSource: () => void;
}) {
  const { theme } = usePreferences();
  return <View pointerEvents="box-none" testID="photo-information-layer" onLayout={event => measurePanel(Math.ceil(event.nativeEvent.layout.height))} style={s.panel}>
    <View style={s.information} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <T testID="place-card-name" variant="place" color={theme.mediaForeground} style={[common.bold, s.text]}
      numberOfLines={1} ellipsizeMode="tail"
      onLayout={event => measureName(Math.ceil(event.nativeEvent.layout.height))}>{place.name}</T>
    <View style={s.row}><Icon name="location-outline" size={14} color={theme.mediaForeground} />
      <T testID="place-card-address" variant="caption" color={theme.mediaForeground} style={[common.flex, s.text]}
        numberOfLines={1} ellipsizeMode="tail">{place.address || "Address unavailable"}</T></View>
    <View style={s.summary}>
      {!!meta.distanceLabel && <View style={[s.row, !!meta.rating && s.distance]}><Icon name="navigate-outline" size={13} color={theme.mediaForeground} />
        <T testID="place-card-distance" variant="caption" color={theme.mediaForeground} style={s.text}
          numberOfLines={1} ellipsizeMode="tail">{meta.distanceLabel}</T></View>}
      {!!meta.rating && <View style={[s.row, common.flex]}><Icon name="star" size={14} color={theme.mediaRating} />
        <T testID="place-card-rating" variant="caption" color={theme.mediaForeground} style={s.text}
          numberOfLines={1} ellipsizeMode="tail">{meta.rating}</T></View>}
    </View>
    {place.attributions.map((item, index) => <T key={index} variant="caption" color={theme.mediaForeground}
      numberOfLines={1} ellipsizeMode="tail" style={s.text}>{item.provider}</T>)}
    </View>
    <View testID="place-card-divider" pointerEvents="none" style={[s.divider, { backgroundColor: theme.mediaDivider }]} />
    <View style={s.footer} pointerEvents="box-none">
      <View style={s.row} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="time-outline" size={14} color={theme.mediaForeground} />
        <T testID="place-card-hours" variant="caption" color={theme.mediaForeground} style={s.text}
          numberOfLines={1} ellipsizeMode="tail">{meta.hours}</T></View>
      <Pressable accessibilityRole="link" accessibilityLabel={"View " + place.name + " in Google Maps"}
        onPress={event => { event.stopPropagation(); onSource(); }} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} style={s.source}>
        <T variant="caption" color={theme.mediaProviderForeground} numberOfLines={1} style={s.attribution}>Google Maps</T>
        <Icon name="open-outline" size={11} color={theme.mediaProviderForeground} />
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  panel: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2, gap: 2 },
  information: { gap: 2 }, divider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0, flexShrink: 1 },
  text: { minWidth: 0, flexShrink: 1 },
  summary: { flexDirection: "row", alignItems: "center", gap: 8 },
  distance: { maxWidth: "42%" },
  footer: { flexDirection: "row", minHeight: 24, alignItems: "center", gap: 8 },
  source: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  attribution: { fontWeight: "400", fontStyle: "normal", letterSpacing: 0 },
});
