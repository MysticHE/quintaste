import { Tabs } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { TabDock } from "../../components/navigation/TabDock";
import { GlassNavigationProvider, TabBackdrop } from "../../components/navigation/GlassNavigation";
import { MarketReminderSync } from "../../components/market/MarketReminderSync";
import { InboxProvider } from "../../components/InboxCounts";
import { useT } from "../../i18n";

export default function TabLayout() {
  const { theme } = usePreferences(), { owner } = useFood(), t = useT("common");
  return <GlassNavigationProvider key={owner}><InboxProvider><Tabs backBehavior="history" tabBar={props => <TabDock {...props} />}
    screenLayout={({ children }) => <TabBackdrop>{children}</TabBackdrop>} screenOptions={{
    // Hidden tabs stop redrawing (phones only); they catch up when shown again.
    headerShown: false, sceneStyle: { backgroundColor: theme.background }, animation: "none", freezeOnBlur: true,
  }}>
    <Tabs.Screen name="(explore)" options={{ title: t("tabExplore") }} />
    <Tabs.Screen name="cook" options={{ title: t("tabCook") }} />
    <Tabs.Screen name="social" options={{ title: t("tabSocial") }} />
    <Tabs.Screen name="game" options={{ title: t("tabGame") }} />
  </Tabs><MarketReminderSync /></InboxProvider></GlassNavigationProvider>;
}
