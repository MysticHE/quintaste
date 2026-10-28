import { useEffect, useRef } from "react";
import { Platform, type LayoutChangeEvent, type ScrollViewInstance, type ViewInstance } from "react-native";
import type { WebOnlyProps } from "../types/web-props";

export type TabRowItem = { attach: (node: ViewInstance | null) => void; onLayout: (event: LayoutChangeEvent) => void; keyboard: WebOnlyProps };
/**
 * Shared behaviour for a sideways-scrolling row of tabs: the selected tab is kept in view when it changes and when it is first laid
 * out, and on the web the row is a single tab stop where Arrow keys, Home and End move between tabs. `selected` is null when no tab
 * is selected; the first tab then takes the tab stop.
 */
export function useTabRow(count: number, selected: number | null, onSelect: (index: number) => void) {
  const scroll = useRef<ScrollViewInstance>(null), offsets = useRef<number[]>([]), items = useRef<(ViewInstance | null)[]>([]);
  const reveal = (x: number | undefined) => { if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 24), animated: false }); };
  useEffect(() => { if (selected !== null) reveal(offsets.current[selected]); }, [selected]);
  const keyDown = (event: KeyboardEvent, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onSelect(next); items.current[next]?.focus();
  };
  /** Props for the tab at `index`: its ref, layout reporting and (web only) its tab stop and keys. */
  const item = (index: number): TabRowItem => ({
    attach: (node: ViewInstance | null) => { items.current[index] = node; },
    onLayout: (event: LayoutChangeEvent) => { const x = event.nativeEvent.layout.x; offsets.current[index] = x; if (index === selected) reveal(x); },
    keyboard: (Platform.OS === "web" ? { tabIndex: index === (selected ?? 0) ? 0 : -1, onKeyDown: (event: KeyboardEvent) => keyDown(event, index) } : {}) as WebOnlyProps,
  });
  return { scroll, item };
}
