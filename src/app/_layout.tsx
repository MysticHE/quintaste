import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { router, Stack, useGlobalSearchParams, usePathname, useRootNavigationState, useSegments, useSitemap, type Href, type SitemapType } from "expo-router";
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
/** Screen names of the root stack, from the route files: `saved/_layout.tsx` is "saved", `market/listing/[id].tsx` is itself. */
const rootScreens = (sitemap: SitemapType | null) => new Set((sitemap?.children ?? []).map(child =>
  child.contextKey.replace(/^\.\//, "").replace(/(\.(web|ios|android|native))?\.[jt]sx?$/, "").replace(/\/_layout$/, "")));
/**
 * The root stack screen that holds the current URL, used as the first screen when the stack mounts or remounts: the route
 * itself, its folder index, or the folder whose own _layout nests it (a reload of /saved/filters opens "saved", which
 * restores its own screen from the URL). Only an exact match takes the URL's params.
 */
function rootRoute(segments: string[], screens: Set<string>) {
  if (!segments.length || segments[0] === "(tabs)") return { route: "(tabs)", exact: true };
  if (!screens.size) return { route: segments.join("/"), exact: true };
  for (let n = segments.length; n > 0; n--) {
    const name = segments.slice(0, n).join("/");
    if (screens.has(name)) return { route: name, exact: n === segments.length };
    if (n === segments.length && screens.has(name + "/index")) return { route: name + "/index", exact: true };
  }
  return { route: "(tabs)", exact: false };
}
function Navigation() {
  const { user } = useAuth();
  const segments = useSegments(), sitemap = useSitemap();
  const params = useGlobalSearchParams(), pathname = usePathname();
  const [initial] = useState(() => ({
    ...rootRoute(segments, rootScreens(sitemap)),
    params,
    // A tab deep link (for example /social?tab=areas) is lost when restoring an account remounts the stack.
    tabLink: segments[0] === "(tabs)" && pathname !== "/" ? { pathname, params } as Href : null,
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
      initialRouteName={initial.route}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "none" : "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      {[...new Set(['(tabs)', ...Object.keys(presentations), initial.route])].map(name => (
        <Stack.Screen key={name} name={name}
          initialParams={name === initial.route && initial.exact ? initial.params : undefined}
          options={{ presentation: presentations[name as keyof typeof presentations] }} />
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
