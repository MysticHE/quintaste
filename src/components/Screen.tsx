import { LinearGradient } from "expo-linear-gradient";
import { router, useIsFocused, useScrollToTop, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Head from "expo-router/head";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreferences } from "../state/Preferences";
import { TimerDock, FoodStorageBanner } from "./food/Timers";
import { Icon, T, common } from "./ui";
import { PhotoScrollView } from "./discovery/PhotoScrollView";
import { DockFollow, useDockScroll, useGlassNavigation } from "./navigation/GlassNavigation";
import { useHideOnScroll, useScreenReaderOn } from "../hooks/useHideOnScroll";
import { SCREEN_GUTTER } from "../theme/layout";
import { useT } from "../i18n";
type ScreenProps = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  footer?: ReactNode;
  floatingAction?: ReactNode;
  headerAction?: ReactNode;
  titleAccessory?: ReactNode;
  compact?: boolean;
  header?: ReactNode;
  backTo?: Href;
  hideTimers?: boolean;
  fill?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};
const ScrollTop = createContext<() => void>(() => {});
/** Scrolls the enclosing screen back to its top, for example after changing a results page. */
export const useScreenScrollToTop = () => useContext(ScrollTop);
export function Screen({ children, title, subtitle, back = true, footer, headerAction, titleAccessory, compact = true, header, backTo, hideTimers = false, fill = false, contentStyle, floatingAction }: PropsWithChildren<ScreenProps>) {
  const { theme, reducedMotion } = usePreferences();
  const segments = useSegments(), hasTabDock = segments.some(segment => segment === "(tabs)");
  const glass = useGlassNavigation(), { width } = useWindowDimensions(), nativeFrame = Platform.OS !== "web" || width < 600;
  const [feedbackHeight, setFeedbackHeight] = useState(0), bottomSpace = hasTabDock ? (glass?.height ?? 0) + feedbackHeight : 0;
  const dockScroll = useDockScroll(hasTabDock), Pinned = hasTabDock ? DockFollow : View;
  const scroll = useRef<ScrollViewInstance>(null), scrollAction = useRef({ scrollToTop: () => {} });
  useEffect(() => {
    scrollAction.current.scrollToTop = () => scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }, [reducedMotion]);
  useScrollToTop(scrollAction);
  const scrollToTop = useCallback(() => scrollAction.current.scrollToTop(), []);
  const heading = header ?? (title || titleAccessory || headerAction ? <ScreenHeading title={title} subtitle={subtitle} back={back} headerAction={headerAction}
    titleAccessory={titleAccessory} compact={compact} backTo={backTo} /> : null);
  // The top bar sits above the scrolling page and slides away while scrolling down, back on scrolling up (owner, 25 Oct 2026);
  // a page that does not scroll (fill: chats) keeps it in place.
  const top = useTopBar(!fill && !!heading), onScroll = (event: Parameters<typeof top.onScroll>[0]) => { dockScroll.onScroll?.(event); top.onScroll(event); };
  const body = <><View style={[common.stack, common.flex, compact && { gap: 12 }]}><ScrollTop.Provider value={scrollToTop}>{children}</ScrollTop.Provider></View>
    {footer && <View style={s.footer}>{footer}</View>}</>;
  // On a phone one gradient runs from the status bar to the bottom edge, so the bars and the page are the same colour.
  return <LinearGradient colors={nativeFrame ? theme.gradient : theme.backdrop} start={{ x: 0, y: 0 }} end={nativeFrame ? { x: 0, y: 1 } : { x: 1, y: 0.9 }} style={s.root}>
    <Head><title>{title ? title + " · QuinTaste" : "QuinTaste"}</title></Head>
    <StatusBar style={theme.dark ? "light" : "dark"} />
    <SafeAreaView edges={hasTabDock ? ["top", "left", "right"] : undefined}
      style={[s.safe, nativeFrame && { paddingHorizontal: 0, paddingVertical: 0 }]}>
      <LinearGradient colors={nativeFrame ? [theme.transparent, theme.transparent] : theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }}
        style={[s.frame, { borderColor: theme.frameBorder }, nativeFrame && { borderRadius: 0, borderWidth: 0 }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={common.flex}>
          <View style={common.flex}>
          {top.enabled && <Animated.View onLayout={event => top.setHeight(event.nativeEvent.layout.height)}
            style={[s.topBar, { backgroundColor: nativeFrame ? theme.background : theme.transparent }, top.style]}>{heading}</Animated.View>}
          {fill ? <View style={[s.content, s.compact, common.flex, contentStyle, { paddingTop: 4, paddingBottom: 16 + bottomSpace + (floatingAction ? 72 : 0) }]}>{heading}{body}</View> :
            <PhotoScrollView scrollRef={scroll} keyboardShouldPersistTaps="handled" {...dockScroll} onScroll={onScroll}
              onContentSizeChange={(width, height) => { dockScroll.onContentSizeChange?.(width, height); top.onContentSizeChange(width, height); }}
              onLayout={event => { dockScroll.onLayout?.(event); top.onLayout(event); }}
              contentContainerStyle={[s.content, compact && s.compact, contentStyle, { paddingTop: top.enabled ? top.height + 8 : 6, paddingBottom: 16 + bottomSpace + (floatingAction ? 72 : 0) }]}
              showsVerticalScrollIndicator={false}>{body}</PhotoScrollView>}
        {floatingAction && <Pinned pointerEvents="box-none" style={{ position: "absolute", bottom: bottomSpace + 12, left: 0, right: 0, alignItems: "center" }}>{floatingAction}</Pinned>}
        <Pinned pointerEvents="box-none" onLayout={event => setFeedbackHeight(event.nativeEvent.layout.height)}
          style={hasTabDock ? { position: "absolute", bottom: glass?.height ?? 0, left: 0, right: 0 } : undefined}>
          {!hideTimers && <TimerDock />}<FoodStorageBanner /><NoticeBanner />
        </Pinned>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  </LinearGradient>;
}
/** The pinned top bar's height, slide and scroll handlers; it shows again when the screen regains focus or a screen reader is on. */
function useTopBar(enabled: boolean) {
  const { reducedMotion } = usePreferences(), screenReader = useScreenReaderOn(), focused = useIsFocused();
  const slide = useSharedValue(0), hidden = useRef(false), [height, setHeight] = useState(56);
  const setHidden = useCallback((next: boolean) => {
    if ((next && screenReader) || hidden.current === next) return;
    hidden.current = next;
    slide.set(withTiming(next ? 1 : 0, { duration: reducedMotion ? 0 : 220 }));
  }, [screenReader, reducedMotion, slide]);
  useEffect(() => { if (focused || screenReader) setHidden(false); }, [focused, screenReader, setHidden]);
  const handlers = useHideOnScroll(enabled ? setHidden : undefined);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -slide.get() * height }] }), [height]);
  return { enabled, height, setHeight, style, ...handlers };
}
function ScreenHeading({ title, subtitle, back, backTo, titleAccessory, headerAction, compact }: ScreenProps) {
  const { theme } = usePreferences(), t = useT("common");
  if (!title && !titleAccessory && !headerAction) return null;
  return <View style={s.heading}><View style={common.row}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel={t("goBack")}
      onPress={() => router.canGoBack() ? router.back() : router.replace(backTo ?? "/")} style={s.back}><Icon name="chevron-back" color={theme.foreground} /></Pressable>}
    {titleAccessory ? <View style={common.flex}>{!!title && <T variant={compact ? "subtitle" : "title"} accessibilityRole="header" style={s.title}>{title}</T>}{titleAccessory}</View>
      : <T variant={compact ? "subtitle" : "title"} accessibilityRole="header" style={[common.flex, s.title]}>{title}</T>}
    {headerAction}
  </View>{!!subtitle && <T variant="small" muted style={s.subtitle}>{subtitle}</T>}</View>;
}
function NoticeBanner() {
  const { theme, notice, setNotice, reload, save } = usePreferences(), t = useT("common");
  const focused = useIsFocused();
  if (!focused) return null;
  return (
    <>
      {notice && (
        <View
          style={[
            s.notice,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          accessibilityLiveRegion={notice.error ? "assertive" : "polite"}
        >
          <Icon
            name={
              notice.error ? "alert-circle-outline" : "checkmark-circle-outline"
            }
            color={notice.error ? theme.error : theme.success}
          />
          <T variant="small" style={common.flex}>
            {notice.text}
          </T>
          {notice.error && notice.preferenceRetry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={notice.preferenceRetry === 'save' ? t("retrySavingPreferences") : t("retryLoadingPreferences")}
              onPress={() => void (notice.preferenceRetry === 'save' ? save() : reload())}
              style={s.back}
            >
              <T color={theme.accent}>{t("retry")}</T>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("dismissMessage")}
            onPress={() => setNotice(null)}
            style={s.back}
          >
            <Icon name="close" />
          </Pressable>
        </View>
      )}
    </>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: { flexGrow: 1, padding: 20, paddingHorizontal: SCREEN_GUTTER, paddingTop: 22, gap: 22 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: 2, paddingBottom: 4 },
  compact: { padding: 16, paddingHorizontal: SCREEN_GUTTER, paddingTop: 14, gap: 14 },
  heading: { gap: 8 },
  title: { minWidth: 0, flexShrink: 1 },
  back: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: { marginHorizontal: 2 },
  footer: { gap: 8, paddingTop: 16, paddingBottom: 6 },
  notice: {
    borderWidth: 1,
    borderRadius: 16,
    margin: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
});
