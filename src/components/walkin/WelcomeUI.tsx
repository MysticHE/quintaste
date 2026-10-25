import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Field, Icon, T, type IconName } from '../ui';
import { usePreferences } from '../../state/Preferences';
import { useKeyboardFocus } from '../../hooks/useKeyboardFocus';
import { fontNames } from '../../theme/tokens';
import { BrandArtwork } from './ReferenceArtwork';
import { useLanguage } from '../../i18n';

export function WelcomeBrand({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  return <BrandArtwork width={Math.min(width, 480)} compact={compact} />;
}

export function WelcomeBack({ onPress, label, disabled }: { onPress: () => void; label: string; disabled?: boolean }) {
  const { focused, focusProps } = useKeyboardFocus(), { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }}
    onPress={onPress} {...focusProps} style={[s.back, { opacity: disabled ? 0.5 : 1, borderColor: focused ? theme.accent : theme.transparent }]}>
    {/* The approved artwork supplies the Back glyph; this 48-point native target supplies its behavior and focus ring. */}
  </Pressable>;
}

function GoogleMark() {
  return <Svg width={30} height={30} viewBox="0 0 48 48" accessible={false}>
    <Path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.41h11a9.4 9.4 0 0 1-4.08 6.17v5.13h6.61c3.87-3.56 6.08-8.82 6.08-14.79Z" />
    <Path fill="#34A853" d="M24 44c5.5 0 10.12-1.82 13.49-4.94l-6.61-5.13c-1.83 1.22-4.17 1.95-6.88 1.95-5.32 0-9.82-3.59-11.43-8.42H5.74v5.29A20.39 20.39 0 0 0 24 44Z" />
    <Path fill="#FBBC05" d="M12.57 27.46a12.24 12.24 0 0 1 0-7.83v-5.29H5.74a20.39 20.39 0 0 0 0 18.41l6.83-5.29Z" />
    <Path fill="#EA4335" d="M24 11.2c3 0 5.69 1.03 7.81 3.05l5.86-5.86A19.65 19.65 0 0 0 24 3.08 20.39 20.39 0 0 0 5.74 14.34l6.83 5.29C14.18 14.8 18.68 11.2 24 11.2Z" />
  </Svg>;
}

export function WelcomeButton({ label, onPress, kind = 'outline', icon, busy, disabled, testID }: {
  label: string; onPress: () => void; kind?: 'outline' | 'primary' | 'google'; icon?: IconName; busy?: boolean; disabled?: boolean; testID?: string;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const { textMultiplier } = usePreferences(), { width } = useWindowDimensions();
  const primary = kind === 'primary', off = disabled || busy;
  const foreground = primary ? (theme.dark ? theme.background : theme.actionForeground) : kind === 'google' ? theme.welcome.foreground : theme.welcome.accent;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off, busy }} disabled={off}
    onPress={onPress} {...focusProps} style={({ pressed }) => [s.action, {
      backgroundColor: primary ? theme.welcome.primary : kind === 'outline' ? theme.welcome.background : theme.card,
      borderColor: focused || kind === 'outline' ? theme.welcome.accent : primary ? theme.welcome.primary : theme.welcome.border,
      borderWidth: focused ? 2 : 1, opacity: off ? 0.55 : pressed ? 0.78 : 1,
    }]}>
    {busy ? <ActivityIndicator color={foreground} /> : kind === 'google' ? <GoogleMark /> : icon ? <Icon name={icon} color={foreground} size={27} /> : null}
    <T variant="button" style={[s.actionText, { color: foreground, fontSize: Math.max(16, 18 * Math.min(width, 480) / 390) * textMultiplier }]}>{label}</T>
  </Pressable>;
}

export function WelcomeDivider({ children }: PropsWithChildren) {
  const { theme } = usePreferences();
  return <View style={s.divider}><View style={[s.rule, { backgroundColor: theme.welcome.border }]} /><T color={theme.welcome.mutedForeground}>{children}</T><View style={[s.rule, { backgroundColor: theme.welcome.border }]} /></View>;
}

export function WelcomeHeading({ title, body, children, size = 'intro' }: { title: string; body: string; children?: ReactNode; size?: 'intro' | 'community' | 'signin' | 'username' }) {
  const { textMultiplier, theme } = usePreferences(), { width } = useWindowDimensions();
  const chinese = useLanguage() === 'zh';
  const scale = Math.min(width, 480) / 390;
  const heading = (size === 'community' ? 36 : size === 'signin' ? 48 : size === 'username' ? 47 : 41) * scale;
  const bodySize = Math.max(16, (size === 'signin' || size === 'username' ? 20 : 18) * scale);
  return <View style={[s.copy, { gap: 8 * scale }]}>
    <T accessibilityRole="header" style={[s.heading, { color: theme.welcome.foreground, fontFamily: chinese ? undefined : fontNames.welcome, fontWeight: chinese ? '800' : undefined, fontSize: heading * textMultiplier, lineHeight: heading * 1.04 * textMultiplier }]}>{title}</T>
    <T style={{ color: theme.welcome.mutedForeground, fontFamily: chinese ? undefined : fontNames.regular, fontSize: bodySize * textMultiplier, lineHeight: bodySize * 1.18 * textMultiplier }}>{body}</T>
    {children}
  </View>;
}

export function WelcomeField({ label, trailing, ...props }: TextInputProps & { label: string; trailing?: ReactNode }) {
  const { theme, textMultiplier } = usePreferences();
  return <View style={{ gap: 5 }}>
    <T style={{ color: theme.dark ? theme.foreground : theme.mascot.ink, fontFamily: fontNames.semibold, fontSize: 15 * textMultiplier }}>{label}</T>
    <Field {...props} label={label} showLabel={false} trailing={trailing}
      fieldStyle={{ borderColor: theme.welcome.border, borderRadius: 10, paddingVertical: 0, minHeight: 48 }}
      style={[{ fontSize: 18 * textMultiplier, minHeight: 46, color: theme.welcome.foreground }, props.style]} />
  </View>;
}

const s = StyleSheet.create({
  back: { position: 'absolute', zIndex: 3, left: 10, top: 2, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2 },
  action: { minHeight: 54, borderRadius: 10, flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { fontFamily: fontNames.bold, flexShrink: 1, textAlign: 'center' },
  divider: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 4 },
  rule: { flex: 1, height: 1 },
  copy: { gap: 8 },
  heading: { fontFamily: fontNames.welcome, letterSpacing: -0.6 },
});
