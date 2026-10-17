import { Stack } from "expo-router";
import { usePreferences } from "../../state/Preferences";
export default function SavedLayout() {
  const { theme } = usePreferences();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />;
}
