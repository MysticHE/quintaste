import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icon, T, type IconName } from '../ui';
import { usePreferences } from '../../state/Preferences';
import { useKeyboardFocus } from '../../hooks/useKeyboardFocus';
import { fontNames } from '../../theme/tokens';

export function WelcomeBrand() {
  const { theme } = usePreferences();
  return <View style={s.brand}>
    <View>
      <Text accessibilityLabel="QuinTaste" allowFontScaling={false} style={[s.wordmark, { color: theme.dark ? theme.foreground : theme.mascot.ink }]}>
        Quin<Text style={{ color: theme.accent }}>Taste</Text>
      </Text>
      <Svg accessible={false} width={13} height={10} viewBox="0 0 13 10" style={{ position: 'absolute', top: -1, left: 45 }}>
        <Path d="M6 9C1 8 0 3 1 1c4 0 6 3 5 8ZM7 9C6 4 9 0 12 0c2 4-1 8-5 9Z" fill={theme.success} />
      </Svg>
    </View>
  </View>;
}

export function WelcomeBack({ onPress, label, disabled }: { onPress: () => void; label: string; disabled?: boolean }) {
  const { focused, focusProps } = useKeyboardFocus(), { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }}
    onPress={onPress} {...focusProps} style={[s.back, { opacity: disabled ? 0.5 : 1, borderColor: focused ? theme.accent : theme.transparent }]}>
    <Icon name="chevron-back" color={theme.foreground} size={25} />
  </Pressable>;
}

function GoogleMark() {
  return <Svg width={23} height={23} viewBox="0 0 48 48" accessible={false}>
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
  const primary = kind === 'primary', off = disabled || busy;
  const foreground = primary ? (theme.dark ? theme.background : theme.actionForeground) : kind === 'google' ? theme.foreground : theme.accent;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off, busy }} disabled={off}
    onPress={onPress} {...focusProps} style={({ pressed }) => [s.action, {
      backgroundColor: primary ? theme.accent : theme.card,
      borderColor: focused || kind === 'outline' ? theme.accent : primary ? theme.accent : theme.border,
      borderWidth: focused ? 2 : 1, opacity: off ? 0.55 : pressed ? 0.78 : 1,
    }]}>
    {busy ? <ActivityIndicator color={foreground} /> : kind === 'google' ? <GoogleMark /> : icon ? <Icon name={icon} color={foreground} size={22} /> : null}
    <T style={[s.actionText, { color: foreground }]}>{label}</T>
  </Pressable>;
}

export function WelcomeDivider({ children }: PropsWithChildren) {
  const { theme } = usePreferences();
  return <View style={s.divider}><View style={[s.rule, { backgroundColor: theme.border }]} /><T muted>{children}</T><View style={[s.rule, { backgroundColor: theme.border }]} /></View>;
}

export function WelcomeHeading({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const { textMultiplier } = usePreferences();
  return <View style={s.copy}>
    <T accessibilityRole="header" style={[s.heading, { fontSize: 34 * textMultiplier, lineHeight: 38 * textMultiplier }]}>{title}</T>
    <T muted style={{ fontSize: 17 * textMultiplier, lineHeight: 23 * textMultiplier }}>{body}</T>
    {children}
  </View>;
}

const s = StyleSheet.create({
  brand: { alignItems: 'center', justifyContent: 'center', minHeight: 60, paddingVertical: 10 },
  wordmark: { fontFamily: fontNames.display, fontSize: 31, letterSpacing: -1.2 },
  back: { position: 'absolute', zIndex: 3, left: 6, top: 6, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2 },
  action: { minHeight: 54, borderRadius: 12, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  actionText: { fontFamily: fontNames.bold, flexShrink: 1, textAlign: 'center' },
  divider: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 4 },
  rule: { flex: 1, height: 1 },
  copy: { gap: 10 },
  heading: { fontFamily: fontNames.display, letterSpacing: -1.1 },
});
