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
import { FeedsProvider } from "../state/Feeds";
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
import { SplashIntro, SplashMark, markAppReady } from '../components/splash/Intro';
import { rememberIntroSettings } from '../components/splash/settings';
import { DocumentLanguage, LanguageProvider, translate, useLanguage } from "../i18n";
void SplashScreen.preventAutoHideAsync().catch(() => {});
// The native splash is the plain brand background the intro starts on, so a quick fade is enough to hand over.
SplashScreen.setOptions({ duration: 200, fade: true });
const presentations = {
  'food-choices': 'modal', login: 'formSheet',
  'create-account': 'formSheet', 'cooking/[id]': 'fullScreenModal',
} as const;
/**
 * Expo Router 58 restores the open screen from the URL when the stack mounts or remounts; the tabs sit beneath a deep link
 * so Back returns to them (this replaces SDK 57's initialRouteName / initialParams).
 */
export const unstable_settings = { anchor: "(tabs)" };
function Navigation() {
  const { user } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams(), pathname = usePathname();
  // The URL the app opened on, kept in case the stack, which mounts only after sign-in is restored, starts elsewhere.
  const [initial] = useState(() => ({
    link: pathname !== "/" ? { href: { pathname, params } as Href, pathname, tab: segments[0] === "(tabs)" } : null,
  }));
  const restored = useRef(false);
  const { ready, theme, reducedMotion } = usePreferences(), language = useLanguage();
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
      // A tab link reopens in place; any other screen goes on top of the tabs so Back still returns to them.
      const link = initial.link;
      if (link && pathname !== link.pathname) { if (link.tab) router.replace(link.href); else router.push(link.href); }
    }
  }, [ready, fontsLoaded, fontError, collectionReady, navigation?.key, user, initial.link, pathname]);
  useEffect(() => {
    if (ready && (fontsLoaded || fontError) && owner === "profile" && collectionReady && navigation?.key && profileRoute) {
      router.replace(profileRoute); clearProfileRoute();
    }
  }, [ready, fontsLoaded, fontError, owner, collectionReady, navigation?.key, profileRoute, clearProfileRoute]);
  useEffect(() => {
    if (ready && (fontsLoaded || fontError))
      void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded, fontError]);
  // The intro hovers until the first screen can show, then fades away.
  useEffect(() => {
    if (ready && (fontsLoaded || fontError) && collectionReady && navigation?.key) markAppReady();
  }, [ready, fontsLoaded, fontError, collectionReady, navigation?.key]);
  const { draft } = usePreferences();
  useEffect(() => {
    if (ready) void rememberIntroSettings({ sounds: draft.sounds, reduceMotion: draft.reduceMotion });
  }, [ready, draft.sounds, draft.reduceMotion]);
  if (!ready || (!fontsLoaded && !fontError))
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <SplashMark language={language} />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "none" : "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      {['(tabs)', ...Object.keys(presentations)].map(name => (
        <Stack.Screen key={name} name={name} options={{ presentation: presentations[name as keyof typeof presentations] }} />
      ))}
    </Stack>
  );
}
function AccountScope() {
  const { user, pending, unavailable, retry, openGuest } = useAuth(), language = useLanguage();
  const say = (key: "restoringSignIn" | "reconnectFailed" | "retryConnection" | "retry" | "openGuestOffline") => translate(language, "common", key);
  useEffect(() => { if (!pending && unavailable) { markAppReady(); void SplashScreen.hideAsync(); } }, [pending, unavailable]);
  // Do not mount guest storage while a saved account session is being restored.
  if (pending || (unavailable && !user)) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    {pending ? <ActivityIndicator accessibilityLabel={say("restoringSignIn")} /> : <>
      <Text>{say("reconnectFailed")}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={say("retryConnection")} style={{ padding: 16, minHeight: 48 }} onPress={retry}><Text>{say("retry")}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={say("openGuestOffline")} style={{ padding: 16, minHeight: 48 }} onPress={openGuest}><Text>{say("openGuestOffline")}</Text></Pressable>
    </>}
  </View>;
  return (
      <PreferencesProvider key={user?.id || "guest"}>
        <FoodProvider><FeedsProvider><TimerAlertsProvider><ExploreLocalProvider><MenusProvider><DiscoveryProvider><Navigation /><DocumentLanguage /><TimerFinishHaptics /><CookedSync /><GameSync /></DiscoveryProvider></MenusProvider></ExploreLocalProvider></TimerAlertsProvider></FeedsProvider></FoodProvider>
      </PreferencesProvider>
  );
}
export default function RootLayout() {
  return <SafeAreaProvider><LanguageProvider><AuthProvider><AccountScope /></AuthProvider><SplashIntro /></LanguageProvider></SafeAreaProvider>;
}
