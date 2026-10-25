import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, BackHandler, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { usePreferences } from '../../state/Preferences';
import { useAuth } from '../../state/Auth';
import { walkIn } from '../../services/walk-in';
import { useT } from '../../i18n';
import { T } from '../ui';
import { IntroductionArtwork } from './ReferenceArtwork';
import { WelcomeHeading } from './WelcomeUI';

const panels = [
  ['walkInDiningTitle', 'walkInDiningBody'], ['walkInRecipesTitle', 'walkInRecipesBody'],
  ['walkInGameTitle', 'walkInGameBody'], ['walkInCommunityTitle', 'walkInCommunityBody'],
] as const;

type SignInComponent = ComponentType<{ onGalleryBack?: () => void }>;
export function WalkInExperience({ SignIn }: { SignIn: SignInComponent }) {
  const { theme } = usePreferences(), { user } = useAuth(), { username } = useLocalSearchParams();
  const [introduce, setIntroduce] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void walkIn.shouldShow().then(show => { if (active) setIntroduce(username ? false : show); });
    return () => { active = false; };
  }, [username]);
  return <View style={[s.root, { backgroundColor: theme.welcome.background }]}>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <SafeAreaView style={s.safe}>
      <View style={[s.frame, { backgroundColor: theme.welcome.background }]}>
        {user || introduce === false ? <SignIn onGalleryBack={() => setIntroduce(true)} /> : introduce === null
          ? <View style={s.loading}><ActivityIndicator color={theme.accent} /></View>
          : <Gallery SignIn={SignIn} />}
      </View>
    </SafeAreaView>
  </View>;
}

function Gallery({ SignIn }: { SignIn: SignInComponent }) {
  const { width } = useWindowDimensions(), { reducedMotion, theme } = usePreferences(), t = useT('me');
  const pageWidth = Math.min(width, 480);
  const scroll = useRef<ScrollViewInstance>(null), current = useRef(0);
  const [page, setPage] = useState(0);
  const go = useCallback((index: number, animate = true) => {
    const next = Math.max(0, Math.min(4, index));
    current.current = next; setPage(next);
    scroll.current?.scrollTo({ x: next * pageWidth, animated: animate && !reducedMotion });
    if (next === 4) walkIn.reachedSignIn();
  }, [pageWidth, reducedMotion]);
  const backToGallery = useCallback(() => go(3), [go]);
  useEffect(() => { scroll.current?.scrollTo({ x: current.current * pageWidth, animated: false }); }, [pageWidth]);
  // Only while the sign-in page is on screen, so a page opened on top keeps its own Back.
  useFocusEffect(useCallback(() => {
    if (page === 4) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current.current === 0) return false;
      go(current.current - 1); return true;
    });
    return () => listener.remove();
  }, [go, page]));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = scroll.current?.getScrollableNode() as HTMLElement | undefined;
    if (!element) return;
    let drag: { x: number; left: number; page: number } | null = null;
    let touch: { x: number; y: number; lastX: number; left: number; page: number; horizontal: boolean | null } | null = null;
    const editable = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, button, a, [role="button"]');
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || editable(event.target) || current.current === 4) return;
      drag = { x: event.clientX, left: element.scrollLeft, page: current.current };
      element.style.scrollSnapType = 'none'; element.setPointerCapture(event.pointerId); element.focus();
    };
    const move = (event: PointerEvent) => { if (drag) { event.preventDefault(); element.scrollLeft = drag.left + drag.x - event.clientX; } };
    const up = (event: PointerEvent) => {
      if (!drag) return;
      const change = drag.x - event.clientX, next = drag.page + (Math.abs(change) > pageWidth * 0.12 ? Math.sign(change) : 0);
      drag = null; element.style.scrollSnapType = 'x mandatory'; go(next);
    };
    const cancel = () => { if (!drag) return; drag = null; element.style.scrollSnapType = 'x mandatory'; go(current.current); };
    // Nested vertical ScrollViews can leave browser touch paging between panels. Own only horizontal
    // gestures on introductions; vertical reading, pinch zoom and sign-in fields keep browser handling.
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || current.current === 4 || editable(event.target)) return;
      const point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY, lastX: point.clientX, left: element.scrollLeft, page: current.current, horizontal: null };
    };
    const touchMove = (event: TouchEvent) => {
      if (!touch) return;
      if (event.touches.length !== 1) { touch = null; element.style.scrollSnapType = 'x mandatory'; return; }
      const point = event.touches[0], dx = touch.x - point.clientX, dy = touch.y - point.clientY;
      if (touch.horizontal === null && Math.max(Math.abs(dx), Math.abs(dy)) > 10) touch.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!touch.horizontal) return;
      event.preventDefault(); touch.lastX = point.clientX;
      element.style.scrollSnapType = 'none'; element.scrollLeft = touch.left + dx;
    };
    const touchEnd = () => {
      if (!touch) return;
      const previous = touch; touch = null;
      if (!previous.horizontal) return;
      element.style.scrollSnapType = 'x mandatory';
      const dx = previous.x - previous.lastX;
      go(previous.page + (Math.abs(dx) > pageWidth * 0.12 ? Math.sign(dx) : 0));
    };
    const touchCancel = () => {
      const previous = touch; touch = null;
      if (previous?.horizontal) { element.style.scrollSnapType = 'x mandatory'; go(previous.page); }
    };
    const key = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); go(current.current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    };
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up); element.addEventListener('pointercancel', cancel); element.addEventListener('keydown', key);
    element.addEventListener('touchstart', touchStart, { passive: true }); element.addEventListener('touchmove', touchMove, { passive: false });
    element.addEventListener('touchend', touchEnd); element.addEventListener('touchcancel', touchCancel);
    return () => {
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', cancel); element.removeEventListener('keydown', key);
      element.removeEventListener('touchstart', touchStart); element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd); element.removeEventListener('touchcancel', touchCancel);
    };
  }, [go, pageWidth]);
  const settled = (x: number) => {
    const next = Math.max(0, Math.min(4, Math.round(x / pageWidth)));
    current.current = next; setPage(next);
    if (next === 4) walkIn.reachedSignIn();
  };
  const description = page < 4 ? `${t(panels[page][0])} ${t(panels[page][1])} ${t('walkInPage', { page: page + 1 })}` : undefined;
  return <ScrollView ref={scroll} testID="walkin-gallery" horizontal pagingEnabled snapToInterval={pageWidth} disableIntervalMomentum decelerationRate="fast" directionalLockEnabled showsHorizontalScrollIndicator={false}
    style={s.fill} contentContainerStyle={s.horizontal} bounces={false} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
    accessible={page < 4} accessibilityRole={page < 4 ? 'adjustable' : undefined} accessibilityLabel={description}
    accessibilityHint={page < 4 ? t('walkInGallery') : undefined} tabIndex={page < 4 ? 0 : -1}
    accessibilityValue={page < 4 ? { min: 1, max: 5, now: page + 1 } : undefined}
    aria-valuemin={page < 4 ? 1 : undefined} aria-valuemax={page < 4 ? 5 : undefined} aria-valuenow={page < 4 ? page + 1 : undefined}
    accessibilityActions={page < 4 ? [{ name: 'increment', label: t(page === 3 ? 'walkInSignIn' : 'walkInNext') }, { name: 'decrement', label: t('walkInPrevious') }] : undefined}
    onAccessibilityAction={event => go(current.current + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
    onMomentumScrollEnd={event => settled(event.nativeEvent.contentOffset.x)}
    onScroll={event => { const x = event.nativeEvent.contentOffset.x; if (Math.abs(x / pageWidth - Math.round(x / pageWidth)) < 0.005) settled(x); }}>
    {panels.map(([title, body], index) => <View key={title} style={{ width: pageWidth, height: '100%' }}
      accessibilityElementsHidden={index !== page} importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'} aria-hidden={index !== page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.panel} nestedScrollEnabled>
        <IntroductionArtwork page={index} width={pageWidth} />
        <View style={[s.copy, { paddingHorizontal: pageWidth * 0.07 }]}><WelcomeHeading title={t(title)} body={t(body)} size={index === 3 ? 'community' : 'intro'} /></View>
        <View style={s.progress} accessible={false}>
          <View style={s.dots}>{panels.map((_, dot) => <View key={dot} style={[s.dot, { width: dot === index ? 12 : 9, backgroundColor: dot === index ? theme.welcome.accent : theme.welcome.dot }]} />)}</View>
          <T style={{ color: theme.welcome.mutedForeground, fontSize: 13 }}>{t(index === 3 ? 'walkInSignIn' : 'walkInSwipe')}</T>
        </View>
      </ScrollView>
    </View>)}
    <View style={{ width: pageWidth, height: '100%' }} accessibilityElementsHidden={page !== 4} importantForAccessibility={page === 4 ? 'auto' : 'no-hide-descendants'} aria-hidden={page !== 4}>
      {page === 4 ? <SignIn onGalleryBack={backToGallery} /> : null}
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, safe: { flex: 1, alignItems: 'center' }, frame: { flex: 1, width: '100%', maxWidth: 480 },
  fill: { flex: 1 }, horizontal: { alignItems: 'stretch' }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  panel: { flexGrow: 1, paddingBottom: 12 }, copy: { paddingTop: 4 },
  progress: { alignItems: 'center', gap: 10, paddingTop: 12, paddingBottom: 10 },
  dots: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 5 }, dot: { height: 9, borderRadius: 5 },
});
