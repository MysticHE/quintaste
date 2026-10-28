import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { usePreferences } from "../state/Preferences";
import type { WebOnlyProps } from "../types/web-props";
import { T, common } from "./ui";

const VISIBLE = 5;
/** A wheel row's height: at least 48 points (a full tap target), growing with the app's text size so the numbers fit. */
export function useWheelItem() {
  const { textMultiplier } = usePreferences();
  return Math.round(48 * Math.max(1, textMultiplier));
}

/**
 * A scroll wheel of numbers, like a phone's alarm clock: the value in the middle row is the chosen one. It snaps to a row, a tap on a
 * row picks it, screen readers get up/down actions and on the web Arrow keys step through it. The parent draws the highlight band.
 */
export function WheelPicker({ values, value, onChange, label, format = String }: {
  values: readonly number[]; value: number; onChange: (value: number) => void; label: string; format?: (value: number) => string;
}) {
  const { theme, textMultiplier } = usePreferences(), item = useWheelItem(), size = (points: number) => ({ fontSize: points * textMultiplier, lineHeight: Math.round(points * 1.2 * textMultiplier) }), scroll = useRef<ScrollViewInstance>(null), settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const index = Math.max(0, values.indexOf(value)), [live, setLive] = useState(index);
  const at = (y: number) => Math.min(values.length - 1, Math.max(0, Math.round(y / item)));
  const pick = (next: number, animated = true) => {
    const clamped = Math.min(values.length - 1, Math.max(0, next));
    setLive(clamped); scroll.current?.scrollTo({ y: clamped * item, animated });
    if (values[clamped] !== value) onChange(values[clamped]);
  };
  // The wheel opens on the chosen value (onLayout below); if the value changes from outside, the wheel follows it.
  const [placed, setPlaced] = useState(index);
  if (placed !== index) { setPlaced(index); setLive(index); }
  useEffect(() => { scroll.current?.scrollTo({ y: index * item, animated: false }); }, [index, item]);
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y, current = at(y);
    if (current !== live) setLive(current);
    // Settle once scrolling has stopped: a slow drag ends without momentum, and the web has no momentum events at all.
    clearTimeout(settleTimer.current); settleTimer.current = setTimeout(() => pick(current), 140);
  };
  // React Native Web does not pass accessibilityValue on, so the web gets the slider's value attributes directly.
  const keyboard: WebOnlyProps = Platform.OS === "web" ? { tabIndex: 0, "aria-valuetext": format(values[live]), "aria-valuenow": values[live],
    "aria-valuemin": values[0], "aria-valuemax": values[values.length - 1], onKeyDown: (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); pick(live + (event.key === "ArrowDown" ? 1 : -1)); }
  } } : {};
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format(values[live]) }}
    accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={event => pick(live + (event.nativeEvent.actionName === "increment" ? 1 : -1), false)} {...keyboard} style={{ height: item * VISIBLE, width: Math.round(76 * Math.max(1, textMultiplier)) }}>
    <ScrollView ref={scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={item} decelerationRate="fast"
      scrollEventThrottle={32} onScroll={onScroll} onLayout={() => scroll.current?.scrollTo({ y: live * item, animated: false })}
      contentContainerStyle={{ paddingVertical: item * Math.floor(VISIBLE / 2) }}>
      {values.map((option, position) => {
        const distance = Math.abs(position - live);
        return <Pressable key={option} importantForAccessibility="no" accessibilityElementsHidden onPress={() => pick(position)} style={[s.item, { height: item }]}>
          <T style={[s.number, common.bold, size(distance === 0 ? 30 : distance === 1 ? 22 : 18), distance > 1 && s.far]}
            color={distance === 0 ? theme.accent : theme.mutedForeground}>{format(option)}</T>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  item: { alignItems: "center", justifyContent: "center" },
  number: { fontVariant: ["tabular-nums"] },
  far: { opacity: 0.45 },
});
