import { Stack } from "expo-router";
import { usePreferences } from "../../../state/Preferences";
export default function CookLayout() {
  const { theme, reducedMotion } = usePreferences();
  return <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "slide_from_right", contentStyle: { backgroundColor: theme.background } }} />;
}
