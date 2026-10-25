import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { View, useWindowDimensions } from 'react-native';

const Layout = createContext<{ width: number; height: number } | null>(null);

/** Measure inside the safe area: window height includes space the page cannot use. */
export function WelcomeLayout({ children }: PropsWithChildren) {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  return <View style={{ flex: 1, width: '100%', maxWidth: window.width > window.height ? 900 : 480 }}
    onLayout={({ nativeEvent: { layout } }) => setMeasured(previous => previous?.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
    <Layout value={measured ?? { width: Math.min(window.width, 480), height: window.height }}>
      {children}
    </Layout>
  </View>;
}

export function useWelcomeLayout() {
  const window = useWindowDimensions();
  const layout = useContext(Layout) ?? { width: Math.min(window.width, 480), height: window.height };
  // A portrait phone shortened by its keyboard must not switch to side-by-side panes.
  const landscape = layout.width >= 600 && layout.width > layout.height;
  const compact = layout.height < 740;
  return { ...layout, landscape, compact, typeScale: Math.min(1, layout.width / 390, layout.height / 820) };
}
