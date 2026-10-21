import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { MarketModal } from "../market/MarketChrome";
import { Button, Icon, T, common, type IconName } from "../ui";

export type TipPoint = { icon: IconName; text: string };

/** An info button beside a heading that opens a short "how it works" card; nothing is said until the member asks. */
export function AiInfoTip({ title, points }: { title: string; points: readonly TipPoint[] }) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={"How " + title.toLowerCase() + " works"} onPress={() => setOpen(true)} hitSlop={10} style={s.button}>
      <Icon name="information-circle-outline" size={20} color={theme.mutedForeground} />
    </Pressable>
    <MarketModal visible={open} onClose={() => setOpen(false)} label={title}>
      <View style={s.points}>
        {points.map(point => <View key={point.text} style={[common.row, s.point]}>
          <View style={[s.badge, { backgroundColor: theme.accentSoft }]}><Icon name={point.icon} size={18} color={theme.accent} /></View>
          <T style={common.flex}>{point.text}</T>
        </View>)}
      </View>
      <Button label="Got It" onPress={() => setOpen(false)} />
    </MarketModal>
  </>;
}

/** How each kind of AI recipe is made, in the member's words. */
export const dishTip: readonly TipPoint[] = [
  { icon: "search-outline", text: "Reads well-rated recipes for your dish" },
  { icon: "leaf-outline", text: "Writes a vegetarian version, step by step" },
  { icon: "nutrition-outline", text: "Adds a shopping list, and nutrition when it can be worked out" },
  { icon: "ribbon-outline", text: "Credits the recipes it learned from" },
];
export const videoTip: readonly TipPoint[] = [
  { icon: "videocam-outline", text: "Watches and listens to the whole video" },
  { icon: "images-outline", text: "Writes the steps, with photos from the video where it can" },
  { icon: "nutrition-outline", text: "Adds a shopping list, and nutrition when it can be worked out" },
  { icon: "person-outline", text: "Credits the creator when you share the video link" },
];

const s = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  points: { gap: 12, paddingVertical: 4 },
  point: { gap: 12, alignItems: "center" },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
