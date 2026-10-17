import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { T, common } from "../ui";
import { ListingPhoto } from "./ListingPhoto";
import { usePreferences } from "../../state/Preferences";
import type { ShopPhotoSlot as PhotoSlot } from "../../types/community";

const names: Record<PhotoSlot, string> = { item: "Food", detail: "More", label: "Label" };
const photoSlots: readonly PhotoSlot[] = ["item", "detail", "label"];
/** One large photo with a thumbnail per supplied photo, so the label, seal and date mark are each one tap away. */
export function ListingGallery({ name, photos }: { name: string; photos: Partial<Record<PhotoSlot, string>> }) {
  const { theme } = usePreferences();
  const slots = photoSlots.filter(slot => !!photos[slot]);
  const [chosen, setChosen] = useState<PhotoSlot>(), slot = chosen && photos[chosen] ? chosen : slots[0];
  return <View style={{ gap: 8 }}>
    <ListingPhoto path={slot ? photos[slot] : null} contain={!!slot && slot !== "item"} label={slot ? name + ", " + names[slot].toLowerCase() + " photo" : undefined} />
    {slots.length > 1 && <View style={s.thumbs} accessibilityRole="radiogroup" accessibilityLabel="Photos">
      {slots.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={names[item] + " photo"} accessibilityState={{ checked: slot === item }}
        onPress={() => setChosen(item)} style={({ pressed }) => [s.thumb, { opacity: pressed ? 0.8 : 1 }]}>
        <View style={[s.ring, { borderColor: slot === item ? theme.accent : theme.transparent }]}>
          <View style={s.frame}><ListingPhoto path={photos[item]} contain={item !== "item"} round={10} /></View>
        </View>
        <T variant="caption" muted={slot !== item} color={slot === item ? theme.accent : undefined} style={common.center}>{names[item]}</T>
      </Pressable>)}
    </View>}
  </View>;
}
const s = StyleSheet.create({
  thumbs: { flexDirection: "row", gap: 10 },
  thumb: { alignItems: "center", gap: 2, minWidth: 48 },
  ring: { borderWidth: 2, borderRadius: 14, padding: 2 },
  frame: { width: 52, height: 52 },
});
