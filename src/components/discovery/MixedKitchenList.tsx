import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { CatalogueVenue } from "../../types/catalogue";
import type { PlaceReviewSummary } from "../../types/place-reviews";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { matchedDish, menuDisplayItems } from "../../utils/menu-display";
import { useDiscovery } from "../../state/Discovery";
import { dishCount, isVegOptions, placeLabels } from "../../utils/venue-kitchen";
import { useLanguage, useT } from "../../i18n";
import { Button, Icon, T, common } from "../ui";
import { DietLabels, useDietText } from "../food/DietLabels";
import { MenuItemRow } from "./MenuItemRow";
import { PlaceDetailAction } from "./PlaceDetailParts";

const previewDishes = 3;

/** Photo-free Explore results share the compact disclosure layout, keeping each kitchen's own claims. */
export function CatalogueVenueRow({ venue, expanded, onToggle, review, edgeToEdge = false }: {
  venue: CatalogueVenue; expanded: boolean; onToggle: () => void; review?: PlaceReviewSummary; edgeToEdge?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), tc = useT("common"), t = useT("explore"), language = useLanguage();
  const options = isVegOptions(venue), labels = placeLabels(venue), dietText = useDietText();
  const distance = venue.distanceKm !== undefined ? tc("kilometres", { km: venue.distanceKm.toFixed(1) }) : "", dishes = venue.itemCount > 0 ? dishCount(venue.itemCount, language) : "";
  // A keyword search leads with the dish that matched.
  const dish = venue.match && matchedDish(venue.match, language), detail = [dish, venue.address, distance, venue.hours?.summary].filter(Boolean).join(" · ");
  return <View testID={options ? "mixed-kitchen-row" : "catalogue-venue-row"} style={[s.card, edgeToEdge && s.edge,
    { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }, edgeToEdge && focused && { borderWidth: 1 }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded} {...focusProps} onPress={onToggle}
      accessibilityLabel={[venue.name, detail, dishes, ...labels.map(dietText.spoken)].filter(Boolean).join(", ")}
      style={({ pressed }) => [common.row, s.body, { opacity: pressed ? 0.75 : 1 }]}>
      <View style={[common.flex, s.text]}>
        <T variant="subtitle" numberOfLines={expanded ? undefined : 2}>{venue.name}</T>
        <T variant="small" muted numberOfLines={1}>{detail}</T>
        {expanded && !!dishes && <View style={[s.tag, { backgroundColor: theme.accentSoft, alignSelf: "flex-start" }]}>
          <T variant="small" color={theme.accent} style={common.bold}>{dishes}</T>
        </View>}
      </View>
      {!expanded && !!dishes && <View style={[s.tag, { backgroundColor: theme.accentSoft }]}>
        <T variant="small" color={theme.accent} style={common.bold}>{dishes}</T>
      </View>}
      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
    </Pressable>
    {!options && (labels.length > 0 || !!review?.count) && <View style={s.facts}>
      <DietLabels labels={labels} />
      {!!review?.count && <View style={s.rating}>
        <Icon name="star" size={14} color={theme.accent} />
        <T variant="small" muted>{review.rating?.toFixed(1)}{t("qtReviewCount", { n: review.count })}</T>
      </View>}
    </View>}
    {expanded && <ExpandedVenue venue={venue} />}
  </View>;
}

function ExpandedVenue({ venue }: { venue: CatalogueVenue }) {
  const { reducedMotion } = usePreferences(), { isSaved, toggleSave, readable } = useFood(), t = useT("explore"), tc = useT("common");
  const savedId = "catalogue-" + venue.id, saved = isSaved("place", savedId);
  const { query } = useDiscovery(), search = venue.match ? query.trim() : "", carry = search ? { q: search } : {};
  return <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(160)} style={s.expanded}>
    {!isVegOptions(venue) && <>
      <T variant="small" selectable>{venue.address}</T>
      <T variant="small" muted>{venue.hours?.summary || t("hoursUnconfirmed")}</T>
    </>}
    {venue.itemCount > 0 && <MenuPreview key={venue.id} venue={venue} />}
    {isVegOptions(venue) && <T variant="small" muted>{t("mixedKitchenSafety")}</T>}
    <View style={common.row}>
      <PlaceDetailAction label={t("details")} icon="information-circle-outline" accessibleLabel={t("detailsFor", { name: venue.name })}
        onPress={() => router.push({ pathname: "/place/[id]", params: { id: savedId, ...carry } } as never)} />
      {venue.itemCount > 0 && <PlaceDetailAction label={t("menu")} icon="book-outline" accessibleLabel={t("viewMenuFor", { name: venue.name })}
        onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id, ...carry } } as never)} />}
      <PlaceDetailAction label={tc(saved ? "saved" : "save")} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable}
        accessibleLabel={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} onPress={() => void toggleSave("place", savedId, venue.name)} />
    </View>
  </Animated.View>;
}

/** Mount only for published menus, avoiding a request for a place with no dishes. */
function MenuPreview({ venue }: { venue: CatalogueVenue }) {
  const { theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  const { menu, busy, error, load } = useMenuDetail(venue.id, venue);
  const dishes = useMemo(() => menu ? menuDisplayItems(menu) : [], [menu]), more = dishes.length - previewDishes;
  return <>
    {busy && !menu && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingDishes")} />}
    {!menu && !busy && !!error && <View style={common.row}>
      <T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">{error}</T>
      <Button label={tc("retry")} variant="link" onPress={() => void load(true)} />
    </View>}
    {dishes.length > 0 && <View>{dishes.slice(0, previewDishes).map(item => <MenuItemRow key={item.id} item={item} />)}</View>}
    {more > 0 && <T variant="small" muted>{t("moreDishes", { n: more })}</T>}
  </>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  body: { gap: 12, padding: 12, minHeight: 56 },
  edge: { borderRadius: 0, borderWidth: 0 },
  text: { gap: 2, minWidth: 0 },
  facts: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  tag: { flexShrink: 0, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 2 },
  expanded: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
});
