import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { menuDisplayItems } from "../../utils/menu-display";
import { dishCount, mixedKitchenSafety } from "../../utils/venue-kitchen";
import { Button, T, common } from "../ui";
import { MenuItemRow } from "./MenuItemRow";
import { PlaceDetailAction } from "./PlaceDetailParts";

const previewDishes = 3;

/** Mixed Kitchen places have no photos, so they list as numbered rows; tapping one opens a few of its vegetarian dishes. */
export function MixedKitchenList({ venues }: { venues: CatalogueVenue[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <View style={s.list}>
    {venues.map((venue, index) => <MixedKitchenRow key={venue.id} venue={venue} number={index + 1} expanded={selected === venue.id}
      onToggle={() => setSelected(selected === venue.id ? null : venue.id)} />)}
  </View>;
}

function MixedKitchenRow({ venue, number, expanded, onToggle }: { venue: CatalogueVenue; number: number; expanded: boolean; onToggle: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const distance = venue.distanceKm !== undefined ? venue.distanceKm.toFixed(1) + " km" : "";
  const detail = [venue.address, distance, venue.hours?.summary].filter(Boolean).join(" · ");
  return <View testID="mixed-kitchen-row" style={[s.card, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} {...focusProps} onPress={onToggle}
      accessibilityLabel={[number + ". " + venue.name, distance, dishCount(venue.itemCount)].filter(Boolean).join(", ")}
      style={({ pressed }) => [common.row, s.body, { opacity: pressed ? 0.75 : 1 }]}>
      <View style={[s.number, { backgroundColor: theme.muted }]}>
        <T variant="small" color={theme.foreground} style={[common.bold, s.digits]}>{number}</T>
      </View>
      <View style={[common.flex, s.text]}>
        <T variant="subtitle" numberOfLines={1}>{venue.name}</T>
        <T variant="small" muted numberOfLines={1}>{detail}</T>
      </View>
      <View style={[s.tag, { backgroundColor: theme.accentSoft }]}>
        <T variant="small" color={theme.accent} style={common.bold}>{dishCount(venue.itemCount)}</T>
      </View>
    </Pressable>
    {expanded && <ExpandedVenue venue={venue} />}
  </View>;
}

function ExpandedVenue({ venue }: { venue: CatalogueVenue }) {
  const { theme } = usePreferences(), { isSaved, toggleSave, readable } = useFood();
  const { menu, busy, error, load } = useMenuDetail(venue.id, venue);
  const savedId = "catalogue-" + venue.id, saved = isSaved("place", savedId);
  const dishes = useMemo(() => menu ? menuDisplayItems(menu) : [], [menu]), more = dishes.length - previewDishes;
  return <View style={s.expanded}>
    {busy && !menu && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading dishes" />}
    {!menu && !busy && !!error && <View style={common.row}>
      <T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">{error}</T>
      <Button label="Retry" variant="link" onPress={() => void load(true)} /></View>}
    {dishes.length > 0 && <View>{dishes.slice(0, previewDishes).map(item => <MenuItemRow key={item.id} item={item} />)}</View>}
    {more > 0 && <T variant="small" muted>{dishCount(more).replace(/^(\d+)/, "$1 more")}</T>}
    <T variant="small" muted>{mixedKitchenSafety}</T>
    <View style={common.row}>
      <PlaceDetailAction label="Details" icon="information-circle-outline" accessibleLabel={"Details for " + venue.name}
        onPress={() => router.push({ pathname: "/place/[id]", params: { id: savedId } } as never)} />
      <PlaceDetailAction label="Menu" icon="book-outline" accessibleLabel={"View menu for " + venue.name}
        onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id } } as never)} />
      <PlaceDetailAction label={saved ? "Saved" : "Save"} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable}
        accessibleLabel={(saved ? "Remove saved " : "Save ") + venue.name} onPress={() => void toggleSave("place", savedId, venue.name)} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  list: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  body: { gap: 12, padding: 12, minHeight: 56 },
  number: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  digits: { fontVariant: ["tabular-nums"] },
  text: { gap: 2, minWidth: 0 },
  tag: { flexShrink: 0, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 2 },
  expanded: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
});
