import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { CatalogueVenue } from "../../types/catalogue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { matchedDish, menuDisplayItems } from "../../utils/menu-display";
import { useDiscovery } from "../../state/Discovery";
import { dishCount } from "../../utils/venue-kitchen";
import { useLanguage, useT } from "../../i18n";
import { Button, T, common } from "../ui";
import { MenuItemRow } from "./MenuItemRow";
import { PlaceDetailAction } from "./PlaceDetailParts";

const previewDishes = 3;

/** Mixed Kitchen places have no photos, so they list as numbered rows (Explore's list); tapping one opens a few of its vegetarian dishes. */
export function MixedKitchenRow({ venue, number, expanded, onToggle }: { venue: CatalogueVenue; number: number; expanded: boolean; onToggle: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), tc = useT("common"), language = useLanguage();
  const distance = venue.distanceKm !== undefined ? tc("kilometres", { km: venue.distanceKm.toFixed(1) }) : "", dishes = dishCount(venue.itemCount, language);
  // A keyword search leads with the dish that matched.
  const dish = venue.match && matchedDish(venue.match, language), detail = [dish, venue.address, distance, venue.hours?.summary].filter(Boolean).join(" · ");
  return <View testID="mixed-kitchen-row" style={[s.card, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} {...focusProps} onPress={onToggle}
      accessibilityLabel={[number + ". " + venue.name, dish, distance, dishes].filter(Boolean).join(", ")}
      style={({ pressed }) => [common.row, s.body, { opacity: pressed ? 0.75 : 1 }]}>
      <View style={[s.number, { backgroundColor: theme.muted }]}>
        <T variant="small" color={theme.foreground} style={[common.bold, s.digits]}>{number}</T>
      </View>
      <View style={[common.flex, s.text]}>
        <T variant="subtitle" numberOfLines={1}>{venue.name}</T>
        <T variant="small" muted numberOfLines={1}>{detail}</T>
      </View>
      <View style={[s.tag, { backgroundColor: theme.accentSoft }]}>
        <T variant="small" color={theme.accent} style={common.bold}>{dishes}</T>
      </View>
    </Pressable>
    {expanded && <ExpandedVenue venue={venue} />}
  </View>;
}

function ExpandedVenue({ venue }: { venue: CatalogueVenue }) {
  const { theme, reducedMotion } = usePreferences(), { isSaved, toggleSave, readable } = useFood(), t = useT("explore"), tc = useT("common");
  const { menu, busy, error, load } = useMenuDetail(venue.id, venue);
  const savedId = "catalogue-" + venue.id, saved = isSaved("place", savedId);
  const { query } = useDiscovery(), search = venue.match ? query.trim() : "", carry = search ? { q: search } : {};
  const dishes = useMemo(() => menu ? menuDisplayItems(menu) : [], [menu]), more = dishes.length - previewDishes;
  return <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(160)} style={s.expanded}>
    {busy && !menu && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingDishes")} />}
    {!menu && !busy && !!error && <View style={common.row}>
      <T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">{error}</T>
      <Button label={tc("retry")} variant="link" onPress={() => void load(true)} /></View>}
    {dishes.length > 0 && <View>{dishes.slice(0, previewDishes).map(item => <MenuItemRow key={item.id} item={item} />)}</View>}
    {more > 0 && <T variant="small" muted>{t("moreDishes", { n: more })}</T>}
    <T variant="small" muted>{t("mixedKitchenSafety")}</T>
    <View style={common.row}>
      <PlaceDetailAction label={t("details")} icon="information-circle-outline" accessibleLabel={t("detailsFor", { name: venue.name })}
        onPress={() => router.push({ pathname: "/place/[id]", params: { id: savedId, ...carry } } as never)} />
      <PlaceDetailAction label={t("menu")} icon="book-outline" accessibleLabel={t("viewMenuFor", { name: venue.name })}
        onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id, ...carry } } as never)} />
      <PlaceDetailAction label={tc(saved ? "saved" : "save")} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable}
        accessibleLabel={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} onPress={() => void toggleSave("place", savedId, venue.name)} />
    </View>
  </Animated.View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  body: { gap: 12, padding: 12, minHeight: 56 },
  number: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  digits: { fontVariant: ["tabular-nums"] },
  text: { gap: 2, minWidth: 0 },
  tag: { flexShrink: 0, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 2 },
  expanded: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
});
