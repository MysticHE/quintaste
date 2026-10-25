import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useWelcomeLayout } from './WelcomeLayout';

/** Text is measured first; the complete illustration fits into the remaining space. */
export function FittedWelcomePage({ children, artwork, artworkAspectRatio, testID }: {
  children: ReactNode; artwork: (width: number, height: number) => ReactNode; artworkAspectRatio: number; testID: string;
}) {
  const { width, height, landscape } = useWelcomeLayout();
  const [contentHeight, setContentHeight] = useState(0);
  const bodyWidth = landscape ? width * 0.56 : width;
  const artWidth = landscape ? width - bodyWidth : width;
  // Keep the entire illustration present even for unusually large text or a long sign-in error.
  const bodyBudget = landscape ? height : height * 0.8;
  const scale = contentHeight > 0 ? Math.min(1, bodyBudget / contentHeight) : 1;
  const fittedHeight = contentHeight * scale;
  // Surplus height belongs below the page, not above and below a centred illustration.
  const artHeight = landscape ? height : Math.min(artWidth / artworkAspectRatio, Math.max(0, height - fittedHeight));
  return <View testID={testID} style={{ width, height, overflow: 'hidden', flexDirection: landscape ? 'row' : 'column' }}>
    <View testID={`${testID}-artwork`} style={{ width: artWidth, height: artHeight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {artwork(artWidth, artHeight)}
    </View>
    <View style={{ width: bodyWidth, height: landscape ? height : fittedHeight, justifyContent: landscape ? 'center' : 'flex-start' }}>
      <View style={{ width: bodyWidth, height: fittedHeight }}>
        <View onLayout={({ nativeEvent: { layout } }) => setContentHeight(previous => Math.abs(previous - layout.height) < 0.5 ? previous : layout.height)}
          style={{ width: bodyWidth, position: 'absolute', top: 0, transformOrigin: 'top center', transform: [{ scale }] }}>
          {children}
        </View>
      </View>
    </View>
  </View>;
}
