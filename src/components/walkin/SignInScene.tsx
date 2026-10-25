import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useLayoutEffect, useRef, type PropsWithChildren } from 'react';
import { WelcomeBack, WelcomeBrand, WelcomeHeading } from './WelcomeUI';
import { SignInArtwork } from './ReferenceArtwork';

export function SignInScene({ children, title, body, onBack, backLabel, busy, compact = false }: PropsWithChildren<{
  title: string; body: string; onBack?: () => void; backLabel: string; busy?: boolean; compact?: boolean;
}>) {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 480);
  const scroll = useRef<ScrollViewInstance>(null);
  useLayoutEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [title]);
  return <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} testID="signin-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View>
        <WelcomeBrand compact={compact} />
        {onBack && <WelcomeBack onPress={onBack} label={backLabel} disabled={busy} />}
      </View>
      <SignInArtwork width={pageWidth} compact={compact} />
      <View style={[s.body, { paddingHorizontal: pageWidth * 0.06, gap: compact ? 18 : 22 }]}>
        <WelcomeHeading title={title} body={body} size={compact ? 'username' : 'signin'} />
        <View style={[s.controls, { gap: compact ? 12 : 16 }]}>{children}</View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 22 },
  body: { paddingHorizontal: 24, gap: 28, paddingTop: 8 },
  controls: { gap: 16 },
});
