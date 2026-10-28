import { StyleSheet, View } from "react-native";
import { usePreferences } from "../state/Preferences";

/**
 * The 2-point accent outline drawn over an edge-to-edge card or row while it has keyboard focus (or is pressed), so the item never
 * changes size and every item in a feed shows focus the same way.
 */
export function FocusOutline({ visible }: { visible: boolean }) {
  const { theme } = usePreferences();
  return visible ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.outline, { borderColor: theme.accent }]} /> : null;
}
const s = StyleSheet.create({ outline: { borderWidth: 2 } });
