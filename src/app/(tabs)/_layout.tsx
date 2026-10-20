import { Tabs } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { TabDock } from "../../components/navigation/TabDock";
import { GlassNavigationProvider, TabBackdrop } from "../../components/navigation/GlassNavigation";
import { MarketReminderSync } from "../../components/market/MarketReminderSync";
import { MarketUnreadProvider } from "../../components/market/MarketUnread";

export default function TabLayout() {
  const { theme } = usePreferences(), { owner } = useFood();
  return <GlassNavigationProvider key={owner}><MarketUnreadProvider><Tabs backBehavior="history" tabBar={props => <TabDock {...props} />}
    screenLayout={({ children }) => <TabBackdrop>{children}</TabBackdrop>} screenOptions={{
    headerShown: false, sceneStyle: { backgroundColor: theme.background }, animation: "none",
  }}>
    <Tabs.Screen name="(explore)" options={{ title: "Explore" }} />
    <Tabs.Screen name="cook" options={{ title: "Cook" }} />
    <Tabs.Screen name="social" options={{ title: "Social" }} />
    <Tabs.Screen name="market" options={{ title: "Market" }} />
    <Tabs.Screen name="game" options={{ title: "Game" }} />
  </Tabs><MarketReminderSync /></MarketUnreadProvider></GlassNavigationProvider>;
}
