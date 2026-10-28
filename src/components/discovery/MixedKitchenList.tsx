import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import type { PlaceReviewSummary } from "../../types/place-reviews";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { matchedDish } from "../../utils/menu-display";
import { useDiscovery } from "../../state/Discovery";
import { dishCount, isVegOptions, placeLabels, placeTileIcon } from "../../utils/venue-kitchen";
import { useLanguage, useT } from "../../i18n";
import { Icon, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { DietLabels, useDietText } from "../food/DietLabels";
import { useOpenStatus } from "../../hooks/useOpenStatus";
import { FocusOutline } from "../FocusOutline";

/** The address without its trailing "Singapore 123456": the row has one line, and every place is in Singapore. */
const shortAddress = (address: string) => address.replace(/,?\s*singapore\s*\d{6}\s*$/i, "").trim() || address;

/**
 * Explore results without a cover photo (owner, 28 Oct 2026): one compact row each, the same on both kitchen tabs. A tap opens the
 * place page, which has the full address, hours, menu and Mixed Kitchen notice, so the row never repeats them; Save sits beside it.
 */
export function CatalogueVenueRow({ venue, review }: { venue: CatalogueVenue; review?: PlaceReviewSummary }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), { isSaved, toggleSave, readable } = useFood();
  const tc = useT("common"), t = useT("explore"), language = useLanguage(), dietText = useDietText();
  const options = isVegOptions(venue), labels = options ? [] : placeLabels(venue), id = "catalogue-" + venue.id, saved = isSaved("place", id);
  const { query } = useDiscovery(), search = venue.match ? query.trim() : "";
  const distance = venue.distanceKm !== undefined ? tc("kilometres", { km: venue.distanceKm.toFixed(1) }) : "";
  // A keyword search leads with the dish that matched, and how many more on the menu match.
  const extra = venue.matchCount ? venue.matchCount - 1 : 0;
  const line = [venue.match && matchedDish(venue.match, language) + (extra ? " " + t("moreMatches", { n: extra }) : ""), distance, shortAddress(venue.address)].filter(Boolean).join(" · ");
  const dishes = venue.itemCount > 0 ? dishCount(venue.itemCount, language) : "", rated = !!review?.count && review.rating !== null;
  const status = useOpenStatus(venue.hours), price = venue.priceRange ? t("priceRange", venue.priceRange) : "";
  return <View testID={options ? "mixed-kitchen-row" : "catalogue-venue-row"} style={[s.row, { backgroundColor: theme.card }]}>
    <Pressable accessibilityRole="link" {...focusProps} accessibilityHint={t("cardHint")}
      accessibilityLabel={[venue.name, line, status?.text, venue.priceRange ? t("priceRangeSpoken", venue.priceRange) : "", dishes, ...labels.map(dietText.spoken),
        rated ? review!.rating?.toFixed(1) + t("qtReviewCount", { n: review!.count }) : ""].filter(Boolean).join(", ")}
      onPress={() => router.push({ pathname: "/place/[id]", params: search ? { id, q: search } : { id } } as never)}
      style={({ pressed }) => [common.row, s.main, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[s.tile, { backgroundColor: theme.muted }]}><Icon name={placeTileIcon(venue)} size={24} color={theme.mutedForeground} /></View>
      <View style={[common.flex, s.text]}>
        <T variant="subtitle" numberOfLines={2}>{venue.name}</T>
        <T variant="small" muted numberOfLines={1}>{line}</T>
        {(labels.length > 0 || !!dishes || rated || !!status || !!price) && <View style={s.tags}>
          {status && <View testID="row-open-status" style={[s.tag, { backgroundColor: status.soft }]}><T variant="small" color={status.color} style={common.bold}>{status.text}</T></View>}
          {!!price && <View testID="row-price" style={[s.tag, { backgroundColor: theme.muted }]}><T variant="small" muted style={common.bold}>{price}</T></View>}
          <DietLabels labels={labels} />
          {!!dishes && <View style={[s.tag, { backgroundColor: theme.accentSoft }]}><T variant="small" color={theme.accent} style={common.bold}>{dishes}</T></View>}
          {rated && <View style={[s.tag, s.rating, { backgroundColor: theme.muted }]}>
            <Icon name="star" size={12} color={theme.accent} /><T variant="small" muted style={common.bold}>{review!.rating?.toFixed(1)}</T>
          </View>}
        </View>}
      </View>
    </Pressable>
    <IconButton appearance="plain" icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable}
      label={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} onPress={() => void toggleSave("place", id, venue.name)} />
    <FocusOutline visible={focused} />
  </View>;
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 16, paddingRight: 8, paddingVertical: 12 },
  main: { flex: 1, gap: 12, minHeight: 56 },
  tile: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  text: { gap: 3, minWidth: 0 },
  tags: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
});
