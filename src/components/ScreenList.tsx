import { FlashList, type FlashListProps, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

/** What a `Screen` with `list` hands its one ScreenList: the page padding, item gap, scroll handlers and scroll-to-top. */
export type ScreenListFrame = {
  padding: { paddingTop: number; paddingBottom: number; paddingHorizontal: number };
  gap: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
  /** The list registers how to scroll back to the top (tab bar re-press, a new results page); null when it unmounts. */
  setScroller: (scroll: ((animated: boolean) => void) | null) => void;
  /** A list that has just appeared (another tab, new results) starts with the top bar and dock showing. */
  reveal: () => void;
};
export const ScreenListContext = createContext<ScreenListFrame | null>(null);
/** The space between a page's items, as the scrolling page spaces its children (`common.stack`). */
export const LIST_GAP = 12;

type Props<T> = Omit<FlashListProps<T>, "ListHeaderComponent" | "ListFooterComponent" | "ItemSeparatorComponent" | "contentContainerStyle"
  | "onScroll" | "onLayout" | "onContentSizeChange" | "renderItem" | "data"> & {
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  /** Shown above the items, spaced like the page (chips, notices, empty and loading states). */
  header?: ReactNode;
  footer?: ReactNode;
  /** Space between grid columns; rows are spaced by `rowGap` (default: the page gap). */
  columnGap?: number;
  rowGap?: number;
  /** A grid without footer content uses the screen's bottom inset instead of adding another row gap. */
  trimEndGap?: boolean;
  /** The items belong to the previous search while the new one loads: they stay put, faded, instead of collapsing. */
  dimmed?: boolean;
};

/**
 * The scrolling list of a `Screen` with `list`: a FlashList that draws only the items near the screen and recycles them, so
 * switching a tab or filter mounts a handful of cards rather than every card at once. It keeps the screen's sliding top bar,
 * dock, padding and scroll-to-top. Outside such a Screen it lays the items out in place (no virtualisation) instead of failing.
 */
export function ScreenList<T>({ header, footer, columnGap = 0, rowGap, trimEndGap = false, dimmed = false, renderItem, numColumns = 1, data, ...props }: Props<T>) {
  const frame = useContext(ScreenListContext), list = useRef<FlashListRef<T>>(null);
  const setScroller = frame?.setScroller, reveal = frame?.reveal;
  useEffect(() => {
    if (!setScroller || !reveal) return;
    setScroller(animated => list.current?.scrollToOffset({ offset: 0, animated }));
    reveal();
    return () => setScroller(null);
  }, [setScroller, reveal]);
  const gap = frame?.gap ?? LIST_GAP, half = columnGap / 2, grid = numColumns > 1;
  // Every cell keeps the same wrapper, so fading old results changes a style, never the element: the cards are not rebuilt.
  const cell: ListRenderItem<T> = info => <View style={[grid && { paddingHorizontal: half,
    paddingBottom: trimEndGap && !footer && info.index >= data.length - (data.length % numColumns || numColumns) ? 0 : rowGap ?? gap }, { opacity: dimmed ? 0.55 : 1 }]}>
    {renderItem(info)}</View>;
  // The empty spacer after the header (before the footer) takes a gap only when real content sits beside it; children that
  // render nothing add no space.
  const top = header ? <View style={{ gap, paddingHorizontal: half }}>{header}<View /></View> : null;
  const bottom = footer ? <View style={{ gap, paddingHorizontal: half }}>{!grid && <View />}{footer}</View> : null;
  if (!frame) return <View style={{ gap }}>{top}
    <View style={grid ? { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -half } : { gap }}>
      {data.map((item, index) => <View key={props.keyExtractor?.(item, index) ?? index} style={grid ? { width: `${100 / numColumns}%` } : undefined}>
        {cell({ item, index, target: "Cell", extraData: props.extraData })}</View>)}
    </View>{bottom}</View>;
  return <FlashList ref={list} {...props} data={data} numColumns={numColumns} renderItem={cell}
    contentContainerStyle={{ ...frame.padding, paddingHorizontal: frame.padding.paddingHorizontal - half }}
    ListHeaderComponent={top} ListFooterComponent={bottom} ItemSeparatorComponent={grid ? null : Separator}
    // Near the top, content that grows above the items (a notice, a chip row) stays in view; further down, the visible item holds still.
    maintainVisibleContentPosition={{ autoscrollToTopThreshold: 32 }}
    onScroll={frame.onScroll} onLayout={frame.onLayout} onContentSizeChange={frame.onContentSizeChange} scrollEventThrottle={64}
    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} />;
}
/** The page gap between list items (a stable component, so separators are not remounted on each render). */
function Separator() {
  return <View style={{ height: useContext(ScreenListContext)?.gap ?? LIST_GAP }} />;
}
