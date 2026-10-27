import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import type { PlaceReviewSummary } from "../../types/place-reviews";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useDiscovery } from "../../state/Discovery";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { catalogueLayout } from "../../theme/layout";
import { dishCount, isVegOptions, placeLabels } from "../../utils/venue-kitchen";
import { matchedDish } from "../../utils/menu-display";
import { useLanguage, useT } from "../../i18n";
import { Icon, T, common, type IconName } from "../ui";
import { SkeletonBlock } from "../Skeleton";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { CataloguePhotoBackdrop } from "./CataloguePhotoBackdrop";

// Every tile reserves room for two-line names/facts, proven labels and ratings. Photos never dictate the row height.
const tileHeight = (text: number, search: boolean) => catalogueLayout.thumbnailHeight + 48 + Math.ceil((164 + (search ? 40 : 0)) * text);

/** A flat Explore tile: food when available, useful text otherwise. Full details and engagement live on the place page. */
export function CatalogueVenueTile({ venue, review, searching }: { venue: CatalogueVenue; review?: PlaceReviewSummary; searching: boolean }) {
  const { theme, textMultiplier } = usePreferences(), { isSaved, toggleSave, readable } = useFood();
  const { fontScale } = useWindowDimensions();
  const { focused, focusProps } = useKeyboardFocus(), t = useT("explore"), tc = useT("common"), language = useLanguage(), dietText = useDietText();
  const { query } = useDiscovery(), search = venue.match ? query.trim() : "", carry = search ? { q: search } : {};
  const id = "catalogue-" + venue.id, saved = isSaved("place", id), options = isVegOptions(venue), labels = placeLabels(venue);
  const dish = venue.match ? matchedDish(venue.match, language) : "", hours = venue.hours?.summary || t("hoursUnconfirmed");
  const distance = venue.distanceKm === undefined ? "" : tc("kilometres", { km: venue.distanceKm.toFixed(1) });
  const rating = review?.count && review.rating !== null ? review.rating.toFixed(1) + " (" + review.count + ")" : "";
  const reviewLabel = review?.count && review.rating !== null ? review.rating.toFixed(1) + t("qtReviewCount", { n: review.count }) : "";
  const details = () => router.push({ pathname: "/place/[id]", params: { id, ...carry } } as never);
  const label = [venue.name, options && t("mixedKitchenSpoken"), dish, venue.address, distance, hours,
    ...labels.map(dietText.spoken), reviewLabel].filter(Boolean).join(". ");
  return <View testID="catalogue-venue-tile" style={[s.card, { height: tileHeight(textMultiplier * Math.max(1, fontScale), searching), backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable testID="catalogue-tile-details" accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t("cardHint")}
      {...focusProps} onPress={details} style={({ pressed }) => [s.main, { opacity: pressed ? .75 : 1 }, Platform.OS === "web" && { outlineWidth: 0, outlineStyle: "solid" }]}>
      {venue.photo?.path && <View testID="catalogue-tile-photo" style={s.photo}>
        <CataloguePhotoBackdrop key={venue.photo.path} path={venue.photo.path} thumbhash={venue.photo.thumbhash} enabled panelHeight={0} />
      </View>}
      <View style={s.body}>
        {!venue.photo?.path && <Icon name="storefront-outline" size={24} color={theme.accent} />}
        <T testID="catalogue-card-name" variant="subtitle" numberOfLines={venue.photo?.path ? 2 : 4}
          style={{ fontSize: 15 * textMultiplier, lineHeight: 20 * textMultiplier }}>{venue.name}</T>
        {!!dish && <TileFact icon="restaurant-outline" text={dish} />}
        <TileFact icon="location-outline" text={venue.photo?.path ? venue.branch || venue.address : venue.address} lines={venue.photo?.path ? 1 : 3} />
        <TileFact icon="time-outline" text={hours} lines={2} />
        {(distance || !!rating || options) && <View style={s.metadata}>
          {!!distance && <T variant="caption" muted>{distance}</T>}
          {!!rating && <View testID="catalogue-card-rating" style={s.inline}><Icon name="star" size={12} color={theme.accent} /><T variant="caption" muted>{rating}</T></View>}
          {options && <T variant="caption" muted>{dishCount(venue.itemCount, language)}</T>}
        </View>}
        {labels.length > 0 && <View style={s.metadata}>{labels.map(label => <View key={label} style={s.inline}>
          <DietIcon diet={label} size={12} color={theme.success} /><T variant="caption" color={theme.success}>{dietText.name(label)}</T>
        </View>)}</View>}
      </View>
    </Pressable>
    <View style={[s.actions, { borderTopColor: theme.border }]}>
      {venue.itemCount > 0 && <TileAction label={t("menu")} accessibleLabel={t("viewMenuFor", { name: venue.name })}
        onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id, ...carry } } as never)} />}
      <TileAction label={t("details")} accessibleLabel={t("detailsFor", { name: venue.name })} onPress={details} />
      <TileAction icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable}
        accessibleLabel={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} onPress={() => void toggleSave("place", id, venue.name)} />
    </View>
  </View>;
}

function TileFact({ icon, text, lines = 2 }: { icon: IconName; text: string; lines?: number }) {
  const { theme, textMultiplier } = usePreferences();
  return <View style={s.fact}><Icon name={icon} size={14} color={theme.mutedForeground} />
    <T variant="caption" muted numberOfLines={lines} style={[common.flex, { lineHeight: 16 * textMultiplier }]}>{text}</T></View>;
}

function TileAction({ label, accessibleLabel, icon, selected, disabled, onPress }: {
  label?: string; accessibleLabel: string; icon?: IconName; selected?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={accessibleLabel} disabled={disabled} accessibilityState={{ disabled, selected }}
    onPress={onPress} style={({ pressed }) => [s.action, !label && s.iconAction, { borderColor: focused ? theme.accent : theme.transparent,
      backgroundColor: pressed || selected ? theme.accentSoft : theme.transparent, opacity: disabled ? .5 : 1 },
      Platform.OS === "web" && { outlineWidth: 0, outlineStyle: "solid" }]}>
    {icon && <Icon name={icon} size={20} color={theme.accent} />}
    {!!label && <T variant="caption" color={theme.accent} numberOfLines={1} style={common.bold}>{label}</T>}
  </Pressable>;
}

export function CatalogueTileSkeleton({ searching }: { searching: boolean }) {
  const { theme, textMultiplier } = usePreferences();
  const { fontScale } = useWindowDimensions();
  return <View style={[s.card, { height: tileHeight(textMultiplier * Math.max(1, fontScale), searching), borderColor: theme.border, backgroundColor: theme.card }]}>
    <SkeletonBlock style={s.photo} /><View style={s.body}>
      <SkeletonBlock style={{ height: 40 * textMultiplier }} />
      <SkeletonBlock style={{ height: 24 * textMultiplier, width: "80%" }} />
      <SkeletonBlock style={{ height: 16 * textMultiplier, width: "65%" }} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: catalogueLayout.radius, overflow: "hidden" },
  main: { flex: 1, minHeight: 48 },
  photo: { height: catalogueLayout.thumbnailHeight, overflow: "hidden", borderRadius: 0 },
  body: { padding: catalogueLayout.gap, gap: 4 },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  inline: { flexDirection: "row", alignItems: "center", gap: 3 },
  actions: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, minHeight: 48 },
  action: { flex: 1, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  iconAction: { flex: 0, width: 48 },
});
