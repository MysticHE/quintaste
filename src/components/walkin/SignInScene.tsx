import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useLayoutEffect, useRef, type PropsWithChildren } from 'react';
import { usePreferences } from '../../state/Preferences';
import { WelcomeBack, WelcomeBrand, WelcomeHeading } from './WelcomeUI';

export function SignInScene({ children, title, body, onBack, backLabel, busy }: PropsWithChildren<{
  title: string; body: string; onBack?: () => void; backLabel: string; busy?: boolean;
}>) {
  const { theme } = usePreferences(), { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 480);
  const scroll = useRef<ScrollViewInstance>(null);
  useLayoutEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [title]);
  return <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} testID="signin-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View>
        <WelcomeBrand />
        {onBack && <WelcomeBack onPress={onBack} label={backLabel} disabled={busy} />}
      </View>
      <View style={{ height: pageWidth * 0.72 }}>
        <Image source={require('../../../assets/walkin/signin.webp')} style={s.fill} contentFit="cover" accessible={false} />
        <LinearGradient colors={[theme.transparent, theme.background]} style={s.fade} pointerEvents="none" />
      </View>
      <View style={s.body}>
        <WelcomeHeading title={title} body={body} />
        <View style={s.controls}>{children}</View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 22 },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30 },
  body: { paddingHorizontal: 24, gap: 28, paddingTop: 8 },
  controls: { gap: 16 },
});
