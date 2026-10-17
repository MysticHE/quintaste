import { createContext, useContext, useLayoutEffect, useRef, useState, useCallback, type Ref } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";

type Item = { top: number; height: number; show: (visible: boolean) => void; continuous?: boolean };
type Viewport = ReturnType<typeof createViewport>;
const Context = createContext<Viewport | null>(null);

function createViewport() {
  let content: View | null = null;
  const items = new Map<symbol, Item>();
  let offset = 0, height = 0;
  const check = () => {
    for (const [id, item] of items) {
      const visible = height > 0 && item.top < offset + height && item.top + item.height > offset;
      if (item.continuous) item.show(visible);
      else if (visible) { items.delete(id); item.show(true); }
    }
  };
  return {
    getContent: () => content,
    setContent: (node: View | null) => { content = node; },
    remove: (id: symbol) => { items.delete(id); },
    watch: (id: symbol, item: Item) => { items.set(id, item); check(); },
    scroll: (top: number, size: number) => { offset = top; height = size; check(); },
    resize: (size: number) => { height = size; check(); },
  };
}

export function PhotoScrollView({ children, scrollRef, contentContainerStyle, onScroll, onLayout, ...props }: ScrollViewProps & {
  scrollRef?: Ref<ScrollView>;
}) {
  const [viewport] = useState(createViewport);
  return <Context.Provider value={viewport}>
    <ScrollView {...props} ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} scrollEventThrottle={64}
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
  const alive = useRef(true), [seen, setSeen] = useState(!viewport);
  const measure = useCallback(() => {
    const parent = viewport?.getContent();
    if (!viewport || !parent || !ref.current || seen && !continuous) return;
    const show = (visible = true) => { if (alive.current) setSeen(visible); };
    ref.current.measureLayout(parent, (_x, top, _width, height) => {
      if (alive.current) viewport.watch(id.current, { top, height, show, continuous });
    }, () => show());
  }, [viewport, seen, continuous]);
  useLayoutEffect(() => {
    alive.current = true; measure();
    const key = id.current;
    return () => { alive.current = false; viewport?.remove(key); };
  }, [viewport, measure]);
  const attach = useCallback((node: View | null) => { ref.current = node; }, []);
  return { attach, onLayout: measure, visible: seen };
}
