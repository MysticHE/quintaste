import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { ListingCard } from "./ListingCard";
import { usePreferences } from "../../state/Preferences";
import type { ListingCard as Listing } from "../../types/community";

/** Two columns, three from 900 wide, one when large text would crowd the cards. */
export function ListingGrid({ items, onSave }: { items: Listing[]; onSave?: (item: Listing) => void }) {
  const { textMultiplier } = usePreferences(), { width, fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0), columns = textMultiplier * fontScale >= 1.3 ? 1 : width >= 900 ? 3 : 2;
  return <View onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={s.grid}>
    {items.map(item => <View key={item.id} style={{ width: gridWidth ? (gridWidth - 12 * (columns - 1)) / columns : "48%" }}>
      <ListingCard listing={item} onSave={onSave ? () => onSave(item) : undefined} />
    </View>)}
  </View>;
}
const s = StyleSheet.create({ grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 20 } });
