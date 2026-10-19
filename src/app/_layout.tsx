import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { router, Stack, useGlobalSearchParams, usePathname, useRootNavigationState, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, Text, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FoodProvider, useFood } from "../state/Food";
import { TimerAlertsProvider } from "../state/TimerAlerts";
import { TimerFinishHaptics } from "../components/food/Timers";
import { CookedSync } from "../components/recipes/CookedSync";
import { GameSync } from "../components/game/GameSync";
import { useTimerNotification } from "../hooks/useTimerNotification";
import { ExploreLocalProvider } from "../state/ExploreLocal";
import { DiscoveryProvider } from "../state/Discovery";
import { MenusProvider } from "../state/Menus";
import { PreferencesProvider, usePreferences } from "../state/Preferences";
import { AuthProvider, useAuth } from "../state/Auth";
import { takeSignInDestination } from '../services/sign-in-destination';
void SplashScreen.preventAutoHideAsync().catch(() => {});
const presentations = {
  'food-choices': 'modal', login: 'formSheet',
  'create-account': 'formSheet', 'cooking/[id]': 'fullScreenModal',
} as const;
function Navigation() {
  const { user } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams(), pathname = usePathname();
  const [initial] = useState(() => ({
    route: segments[0] === "(tabs)" ? "(tabs)" : segments.join("/") || "(tabs)",
    params,
    // A tab deep link (for example /social?tab=areas) is lost when restoring an account remounts the stack.
    tabLink: segments[0] === "(tabs)" && pathname !== "/" ? { pathname, params } as Href : null,
  }));
  const restored = useRef(false);
  const { ready, theme, reducedMotion } = usePreferences();
  const { ready: collectionReady, owner, profileRoute, clearProfileRoute } = useFood();
  const navigation = useRootNavigationState();
  useTimerNotification(ready && collectionReady && !!navigation?.key);
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  useEffect(() => {
    if (!ready || !(fontsLoaded || fontError) || !collectionReady || !navigation?.key) return;
    const destination = user ? takeSignInDestination() : null;
    if (destination) {
      restored.current = true;
      router.replace(user?.adultConfirmed ? destination : { pathname: '/account-eligibility', params: { returnTo: String(destination) } });
    } else if (!restored.current) {
      restored.current = true;
      const link = initial.tabLink as { pathname: string } | null;
      if (link && pathname !== link.pathname) router.replace(initial.tabLink as Href);
    }
  }, [ready, fontsLoaded, fontError, collectionReady, navigation?.key, user, initial.tabLink, pathname]);
  useEffect(() => {
    if (ready && (fontsLoaded || fontError) && owner === "profile" && collectionReady && navigation?.key && profileRoute) {
      router.replace(profileRoute); clearProfileRoute();
    }
  }, [ready, fontsLoaded, fontError, owner, collectionReady, navigation?.key, profileRoute, clearProfileRoute]);
  useEffect(() => {
    if (ready && (fontsLoaded || fontError))
      void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded, fontError]);
  if (!ready || (!fontsLoaded && !fontError))
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator
          color={theme.accent}
          accessibilityLabel="Loading QuinTaste"
        />
      </View>
    );
  return (
    <Stack
      initialRouteName={initial.route}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "none" : "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      {[...new Set(['(tabs)', ...Object.keys(presentations), initial.route])].map(name => (
        <Stack.Screen key={name} name={name}
          initialParams={name === initial.route ? initial.params : undefined}
          options={{ presentation: presentations[name as keyof typeof presentations] }} />
      ))}
    </Stack>
  );
}
function AccountScope() {
  const { user, pending, unavailable, retry, openGuest } = useAuth();
  useEffect(() => { if (!pending && unavailable) void SplashScreen.hideAsync(); }, [pending, unavailable]);
  // Do not mount guest storage while a saved account session is being restored.
  if (pending || (unavailable && !user)) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    {pending ? <ActivityIndicator accessibilityLabel="Restoring sign-in" /> : <>
      <Text>Unable to reconnect. Your sign-in is kept on this device.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry connection" style={{ padding: 16, minHeight: 48 }} onPress={retry}><Text>Retry</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open guest collection offline" style={{ padding: 16, minHeight: 48 }} onPress={openGuest}><Text>Open guest collection offline</Text></Pressable>
    </>}
  </View>;
  return (
      <PreferencesProvider key={user?.id || "guest"}>
        <FoodProvider><TimerAlertsProvider><ExploreLocalProvider><MenusProvider><DiscoveryProvider><Navigation /><TimerFinishHaptics /><CookedSync /><GameSync /></DiscoveryProvider></MenusProvider></ExploreLocalProvider></TimerAlertsProvider></FoodProvider>
      </PreferencesProvider>
  );
}
export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><AccountScope /></AuthProvider></SafeAreaProvider>;
}
