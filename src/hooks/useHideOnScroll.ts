import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

const SCROLL_STEP = 24;

/**
 * Scroll handlers for something that gets out of the way while reading (the bottom dock, a screen's top bar): scrolling
 * down a little hides it, scrolling back up or reaching the top shows it, and it shows whenever the content fits without
 * scrolling, so it is never left hidden with no scroll to bring it back.
 */
export function useHideOnScroll(setHidden: ((hidden: boolean) => void) | undefined) {
  const track = useRef({ y: 0, anchor: 0, content: 0, frame: 0 });
  const fits = useCallback(() => {
    const t = track.current;
    if (t.frame > 0 && t.content <= t.frame + SCROLL_STEP) setHidden?.(false);
  }, [setHidden]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!setHidden) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent, t = track.current;
    // Clamped so the bounce past either end reads as no movement.
    const y = Math.max(0, Math.min(contentOffset.y, contentSize.height - layoutMeasurement.height));
    if ((y - t.y) * (t.y - t.anchor) < 0) t.anchor = t.y;
    t.y = y;
    if (y < SCROLL_STEP || t.anchor - y > SCROLL_STEP) setHidden(false);
    else if (y - t.anchor > SCROLL_STEP) setHidden(true);
  }, [setHidden]);
  const onContentSizeChange = useCallback((_width: number, height: number) => { track.current.content = height; fits(); }, [fits]);
  const onLayout = useCallback((event: LayoutChangeEvent) => { track.current.frame = event.nativeEvent.layout.height; fits(); }, [fits]);
  return { onScroll, onContentSizeChange, onLayout };
}

/** Whether a screen reader is on; moving bars stay put for its users, since a moving target is hard to find by swipe. */
export function useScreenReaderOn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // React Native Web always answers "enabled", which would pin the bars for everyone in a browser.
    if (Platform.OS === "web") return;
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (alive) setOn(value); }).catch(() => { if (alive) setOn(false); });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setOn);
    return () => { alive = false; subscription.remove(); };
  }, []);
  return on;
}
