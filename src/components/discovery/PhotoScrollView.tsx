import { createContext, useContext, useLayoutEffect, useRef, useState, useCallback, type Ref } from "react";
import { Dimensions, ScrollView, View, type ScrollViewProps } from "react-native";

type Item = { top: number; height: number; show: (visible: boolean) => void; continuous?: boolean; refresh: () => void };
type Viewport = ReturnType<typeof createViewport>;
const Context = createContext<Viewport | null>(null);

function createViewport() {
  let content: View | null = null;
  const items = new Map<symbol, Item>(), pending = new Map<symbol, () => void>();
  let offset = 0, height = 0;
  const check = () => {
    // Until the scroll view reports its height (web may not before the first scroll), the window bounds it.
    const size = height > 0 ? height : Dimensions.get("window").height;
    for (const [id, item] of items) {
      const visible = size > 0 && item.top < offset + size && item.top + item.height > offset;
      if (item.continuous) item.show(visible);
      else if (visible) { items.delete(id); item.show(true); }
    }
  };
  return {
    getContent: () => content,
    // Children lay out before the content container's ref attaches; their first measurements wait for it here.
    setContent: (node: View | null) => {
      content = node;
      if (node) { const waiting = [...pending.values()]; pending.clear(); waiting.forEach(run => run()); }
    },
    defer: (id: symbol, run: () => void) => { pending.set(id, run); },
    remove: (id: symbol) => { items.delete(id); pending.delete(id); },
    watch: (id: symbol, item: Item) => { items.set(id, item); check(); },
    scroll: (top: number, size: number) => { offset = top; height = size; check(); },
    resize: (size: number) => { height = size; check(); },
    // Web onLayout fires only on size changes, so positions are re-read whenever the content changes size.
    refresh: () => { for (const item of [...items.values()]) item.refresh(); },
  };
}

export function PhotoScrollView({ children, scrollRef, contentContainerStyle, onScroll, onLayout, onContentSizeChange, ...props }: ScrollViewProps & {
  scrollRef?: Ref<ScrollView>;
}) {
  const [viewport] = useState(createViewport);
  return <Context.Provider value={viewport}>
    <ScrollView {...props} ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} scrollEventThrottle={64} onContentSizeChange={(width, height) => { viewport.refresh(); onContentSizeChange?.(width, height); }}
      onScroll={event => {
        viewport.scroll(event.nativeEvent.contentOffset.y, event.nativeEvent.layoutMeasurement.height);
        onScroll?.(event);
      }}
      onLayout={event => { viewport.resize(event.nativeEvent.layout.height); onLayout?.(event); }}>
      <View ref={node => viewport.setContent(node)} collapsable={false} style={contentContainerStyle}>{children}</View>
    </ScrollView>
  </Context.Provider>;
}

export function usePhotoVisibility(continuous = false) {
  const viewport = useContext(Context), ref = useRef<View>(null), id = useRef(Symbol("photo"));
  const alive = useRef(true), [seen, setSeen] = useState(!viewport), latest = useRef<() => void>(() => {});
  const measure = useCallback(() => {
    const parent = viewport?.getContent();
    if (!viewport || !ref.current || seen && !continuous) return;
    if (!parent) { viewport.defer(id.current, () => latest.current()); return; }
    const show = (visible = true) => { if (alive.current) setSeen(visible); };
    ref.current.measureLayout(parent, (_x, top, _width, height) => {
      if (alive.current) viewport.watch(id.current, { top, height, show, continuous, refresh: () => latest.current() });
    }, () => show());
  }, [viewport, seen, continuous]);
  useLayoutEffect(() => {
    latest.current = measure;
    alive.current = true; measure();
    const key = id.current;
    return () => { alive.current = false; viewport?.remove(key); };
  }, [viewport, measure]);
  const attach = useCallback((node: View | null) => { ref.current = node; }, []);
  return { attach, onLayout: measure, visible: seen };
}
