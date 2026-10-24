import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { MarketModal } from "../market/MarketChrome";
import { Button, Icon, T, common, type IconName } from "../ui";
import { useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";

export type TipPoint = { icon: IconName; text: CookKey };

/** An info button beside a heading that opens a short "how it works" card; nothing is said until the member asks. */
export function AiInfoTip({ title, points }: { title: string; points: readonly TipPoint[] }) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), t = useT("cook");
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("howWorks", { title })} onPress={() => setOpen(true)} hitSlop={10} style={s.button}>
      <Icon name="information-circle-outline" size={20} color={theme.mutedForeground} />
    </Pressable>
    <MarketModal visible={open} onClose={() => setOpen(false)} label={title}>
      <View style={s.points}>
        {points.map(point => <View key={point.text} style={[common.row, s.point]}>
          <View style={[s.badge, { backgroundColor: theme.accentSoft }]}><Icon name={point.icon} size={18} color={theme.accent} /></View>
          <T style={common.flex}>{t(point.text)}</T>
        </View>)}
      </View>
      <Button label={t("gotIt")} onPress={() => setOpen(false)} />
    </MarketModal>
  </>;
}

/** How each kind of AI recipe is made, in the member's words. */
export const dishTip: readonly TipPoint[] = [
  { icon: "search-outline", text: "tipDishRead" },
  { icon: "leaf-outline", text: "tipDishWrite" },
  { icon: "nutrition-outline", text: "tipShoppingNutrition" },
  { icon: "ribbon-outline", text: "tipCredits" },
];
export const videoTip: readonly TipPoint[] = [
  { icon: "videocam-outline", text: "tipVideoWatch" },
  { icon: "images-outline", text: "tipVideoSteps" },
  { icon: "nutrition-outline", text: "tipShoppingNutrition" },
  { icon: "person-outline", text: "tipCreator" },
];

const s = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  points: { gap: 12, paddingVertical: 4 },
  point: { gap: 12, alignItems: "center" },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
