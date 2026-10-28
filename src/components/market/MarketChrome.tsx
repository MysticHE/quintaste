import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
/** Market screens keep their name for the shared dialog. */
export { Dialog as MarketModal } from "../Dialog";
export function MarketToolbar({ children, back = true }: PropsWithChildren<{ back?: boolean }>) {
  const { theme } = usePreferences(), t = useT("market");
  return <View style={[common.row, { gap: 6 }]}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel={t("goBack")} onPress={() => router.canGoBack() ? router.back() : router.replace("/cook?tab=market")} style={s.back}>
      <Icon name="chevron-back" color={theme.foreground} /></Pressable>}
    <View style={common.flex}>{children}</View>
  </View>;
}
const s = StyleSheet.create({
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

