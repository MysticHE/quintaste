import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useEffect, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react';
import { WelcomeBack, WelcomeHeading } from './WelcomeUI';
import { CompleteSignInArtwork } from './ReferenceArtwork';
import { FittedWelcomePage } from './FittedWelcomePage';
import { useWelcomeLayout } from './WelcomeLayout';

export function SignInScene({ children, title, body, onBack, backLabel, busy, compact = false }: PropsWithChildren<{
  title: string; body: string; onBack?: () => void; backLabel: string; busy?: boolean; compact?: boolean;
}>) {
  const { height, compact: short } = useWelcomeLayout();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  useLayoutEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [title]);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); scroll.current?.scrollTo({ y: 0, animated: false }); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} testID="signin-scroll" scrollEnabled={keyboardVisible} bounces={false}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{ height }} showsVerticalScrollIndicator={false}>
      <FittedWelcomePage testID="walkin-signin-page" artwork={(width, availableHeight) => {
        const aspect = (compact ? 657 : 849) / 853;
        const artWidth = Math.min(width, availableHeight / aspect);
        return <View style={{ width: artWidth, height: artWidth * aspect }}>
          <CompleteSignInArtwork width={artWidth} height={availableHeight} compact={compact} />
          {onBack && <WelcomeBack onPress={onBack} label={backLabel} disabled={busy}
            left={Math.max(0, artWidth * 0.086 - 24)} top={Math.max(0, artWidth * 0.07 - 24)} />}
        </View>;
      }}>
        <View style={{ paddingHorizontal: short ? 18 : 24, paddingTop: 6, paddingBottom: short ? 6 : 12, gap: short ? 8 : 12 }}>
          <WelcomeHeading title={title} body={body} size={compact ? 'username' : 'signin'} />
          <View style={{ gap: short ? 4 : 8 }}>{children}</View>
        </View>
      </FittedWelcomePage>
    </ScrollView>
  </KeyboardAvoidingView>;
}
