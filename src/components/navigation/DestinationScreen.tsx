import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../Screen";
import { MeButton } from "../food/Controls";
import { Button, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { QuinTasteIcon } from "./QuinTasteIcon";

/** A dock tab that is not open yet: its own icon, what is coming, and something useful to do meanwhile. */
export function DestinationScreen({ kind, title, message, action, href }: {
  kind: "social" | "game"; title: string; message: string; action: string; href: Href;
}) {
  const { theme } = usePreferences();
  return <Screen back={false} header={<View style={s.header}><MeButton /></View>}>
    <View style={s.content}>
      <View style={[s.tile, { backgroundColor: theme.accentSoft }]}><QuinTasteIcon name={kind} color={theme.accent} size={44} /></View>
      <T variant="title" accessibilityRole="header" style={[common.bold, common.center]}>{title}</T>
      <T muted style={s.message}>{message}</T>
      <View style={s.action}><Button label={action} icon="restaurant-outline" onPress={() => router.navigate(href)} /></View>
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-end" },
  content: { flex: 1, minHeight: 320, justifyContent: "center", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingBottom: 48 },
  tile: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  message: { textAlign: "center", maxWidth: 300 },
  action: { marginTop: 12, minWidth: 180 },
});
