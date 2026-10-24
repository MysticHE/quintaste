import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "../food/Controls";
import { T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { ListingPhoto } from "./ListingPhoto";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { kindKeys } from "../../config/market";
import { marketMoney, slotDay } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { ListingCard as Listing } from "../../types/community";

/** Photo with the item type, then price, name and one line: shop and the next collection day. */
export function ListingCard({ listing, onSave }: { listing: Listing; onSave?: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("market"), kind = t(kindKeys[listing.kind]);
  const price = marketMoney(listing.priceCents), next = slotDay(listing.nextSlot, useLanguage()), few = listing.left !== null && listing.left <= 5;
  const when = listing.soldOut ? t("soldOut") : next ? t("nextDay", { day: next }) : t("noCollectionSet");
  const meta = [listing.sellerName, when].join(" · ");
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={[listing.name, price, listing.portion, listing.sellerName, kind, listing.soldOut ? t("soldOutSpoken") : next && t("nextCollection", { day: next }), !listing.soldOut && few && t("unitsLeft", { n: listing.left ?? 0 })].filter(Boolean).join(", ")}
      onPress={() => router.push({ pathname: "/market/listing/[id]", params: { id: listing.id } })} {...focusProps}
      style={({ pressed }) => [s.card, { opacity: pressed ? 0.85 : 1 }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid" }]}>
      <View>
        <ListingPhoto path={listing.photo} />
        <View style={s.badge}><StatusPill label={kind} tone={listing.kind === "prepacked" ? "accent" : "muted"} />
          {listing.soldOut ? <StatusPill label={t("soldOut")} tone="muted" /> : few && <StatusPill label={t("unitsLeft", { n: listing.left ?? 0 })} tone="warning" />}</View>
      </View>
      <View style={s.info}>
        <T style={common.bold} numberOfLines={1}>{price}<T variant="small" muted>{listing.portion ? "  " + listing.portion : ""}</T></T>
        <T variant="small" numberOfLines={2}>{listing.name}</T>
        <T variant="caption" muted numberOfLines={1}>{meta}</T>
      </View>
    </Pressable>
    {onSave && <View style={s.save}><IconButton appearance="media" label={t(listing.saved ? "unsaveName" : "saveName", { name: listing.name })} icon={listing.saved ? "bookmark" : "bookmark-outline"}
      selected={listing.saved} onPress={onSave} /></View>}
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 16 },
  info: { paddingHorizontal: 2, paddingTop: 8, gap: 2 },
  badge: { position: "absolute", bottom: 8, left: 8, right: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  save: { position: "absolute", top: 6, right: 6 },
});
