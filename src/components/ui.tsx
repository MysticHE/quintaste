import { Ionicons } from "@expo/vector-icons";
import {
  useState,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePreferences } from "../state/Preferences";
import { fontNames, typeScale } from "../theme/tokens";
import { compactType, useCompactUI } from "./ui-density";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
export type IconName = ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { theme } = usePreferences();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? theme.mutedForeground}
      accessible={false}
      aria-hidden={true}
    />
  );
}
export function T({
  variant = "body",
  muted,
  color,
  style,
  ...props
}: TextProps & {
  variant?: keyof typeof typeScale;
  muted?: boolean;
  color?: string;
}) {
  const { textMultiplier, theme } = usePreferences();
  const compact = useCompactUI();
  return (
    <Text
      {...props}
      style={[
        {
          color: color ?? (muted ? theme.mutedForeground : theme.foreground),
          fontSize: (compact ? compactType[variant] : typeScale[variant]) * textMultiplier,
          fontFamily:
            variant === "title" ||
            variant === "display" ||
            variant === "subtitle"
              ? fontNames.display
              : variant === "button"
                ? fontNames.semibold
                : fontNames.regular,
        },
        style,
      ]}
    />
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ComponentProps<typeof View>["style"] }>) {
  const { theme } = usePreferences();
  const compact = useCompactUI();
  return (
    <View
      style={[
        s.card,
        compact && { padding: 12, borderRadius: 16, shadowOpacity: 0, elevation: 0 },
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "link";
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { theme } = usePreferences();
  const { focused, focusProps } = useKeyboardFocus();
  // Dark backdrops sit close to the action hue, so dark mode fills primary buttons with the light accent and dark text.
  const fill = theme.dark ? theme.accent : theme.action[0], onFill = theme.dark ? theme.background : theme.actionForeground;
  const content = (
    <View style={s.buttonContent}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? onFill : theme.accent}
        />
      ) : icon ? <Icon name={icon} size={18} color={variant === "primary" ? onFill : theme.accent} /> : null}
          <T
            variant="button"
            color={
              variant === "primary"
                ? onFill
                : variant === "link"
                  ? theme.accent
                  : theme.foreground
            }
            style={s.buttonLabel}
          >
            {label}
          </T>
    </View>
  );
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      {...focusProps}
      style={({ pressed }) => [
        s.button,
        {
          opacity: disabled || loading ? 0.6 : pressed ? 0.8 : 1,
          borderColor: focused
            ? theme.accent
            : variant === "secondary"
              ? theme.border
              : theme.transparent,
          backgroundColor: variant === "primary" ? fill
            : variant === "secondary" ? theme.card : pressed ? theme.accentSoft : theme.transparent,
        },
        variant === "link" && s.link,
      ]}
    >
      {content}
    </Pressable>
  );
}
export function Field({
  label,
  icon,
  error,
  trailing,
  fieldStyle,
  showLabel = true,
  ...props
}: TextInputProps & {
  label: string;
  icon?: IconName;
  error?: string;
  trailing?: ReactNode;
  fieldStyle?: StyleProp<ViewStyle>;
  /** False when a heading above already names the field; the label is still read aloud. */
  showLabel?: boolean;
}) {
  const { theme, textMultiplier } = usePreferences();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {showLabel && <T variant="small" style={s.bold}>{label}</T>}
      <View
        style={[
          s.field,
          fieldStyle,
          {
            backgroundColor: theme.card,
            borderColor: error
              ? theme.error
              : focused
                ? theme.accent
                : StyleSheet.flatten(fieldStyle)?.borderColor ?? theme.border,
          },
          Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: focused ? 2 : 0, outlineColor: theme.accent, outlineOffset: 0 },
        ]}
      >
        {icon && <Icon name={icon} />}
        <View style={s.fieldMain}>
          <TextInput
            {...props}
            accessibilityLabel={label}
            onFocus={event => { setFocused(true); props.onFocus?.(event); }}
            onBlur={event => { setFocused(false); props.onBlur?.(event); }}
            placeholderTextColor={theme.mutedForeground}
            selectionColor={theme.accent}
            style={[
              s.input,
              props.multiline && { minHeight: 64, textAlignVertical: "top" },
              Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 },
              {
                fontSize: typeScale.body * textMultiplier,
                color: theme.foreground,
                fontFamily: fontNames.regular,
              },
              props.style,
            ]}
          />
        </View>
        {trailing}
      </View>
      {error && (
        <T
          variant="small"
          color={theme.error}
          accessibilityLiveRegion="polite"
          style={s.error}
        >
          {error}
        </T>
      )}
    </View>
  );
}
export function Divider() {
  const { theme } = usePreferences();
  return <View style={[s.divider, { backgroundColor: theme.divider }]} />;
}
export const common = StyleSheet.create({
  stack: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  bold: { fontFamily: fontNames.bold },
  section: { marginTop: 8, marginBottom: 10 },
});
const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  buttonContent: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonLabel: { textAlign: "center", flexShrink: 1 },
  link: { alignSelf: "flex-start" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
  },
  fieldMain: { flex: 1 },
  input: { paddingVertical: 4, minHeight: 30, width: "100%" },
  bold: { fontFamily: fontNames.bold },
  error: { marginTop: 5, marginHorizontal: 8 },
  divider: { height: 1, marginVertical: 10 },
});
