import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../Screen";
import { MeButton } from "../food/Controls";
import { Button, T } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { QuinTasteIcon } from "./QuinTasteIcon";

export function DestinationScreen({ kind, message, action, href }: {
  kind: "social" | "game"; message: string; action: string; href: Href;
}) {
  const { theme } = usePreferences();
  return <Screen back={false} header={<View style={s.header}><MeButton /></View>}>
    <View style={s.content}>
      <QuinTasteIcon name={kind} color={theme.accent} size={48} />
      <T muted style={s.message}>{message}</T>
      <Button label={action} variant="secondary" onPress={() => router.navigate(href)} />
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-end" },
  content: { flex: 1, minHeight: 240, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingBottom: 48 },
  message: { textAlign: "center", maxWidth: 300 },
});
